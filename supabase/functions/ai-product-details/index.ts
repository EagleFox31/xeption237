// @ts-ignore
const Deno = globalThis.Deno;

import { assertAiRateLimit, rateLimitJsonResponse } from '../_shared/rateLimit.ts';
import { assertAuthenticatedStaff, staffAuthJsonResponse } from '../_shared/staffAuth.ts';
import { deepseekChatJson } from '../_shared/deepseekTextJson.ts';
import {
  buildProductEnricherPrompt,
  parseProductEnricherOutput,
  ALL_PRODUCT_ENRICHER_FIELDS,
  type ProductEnricherField,
  type ProductEnricherContext,
} from '../_shared/personas/productEnricher.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_NAME_LEN = 200;
const MAX_CATEGORY_LEN = 80;
const MAX_CONTEXT_DESC = 4000;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const parseFields = (
  raw: unknown,
): ProductEnricherField[] | 'all' | null => {
  if (raw == null || raw === 'all') return 'all';
  if (typeof raw === 'string') {
    if (ALL_PRODUCT_ENRICHER_FIELDS.includes(raw as ProductEnricherField)) {
      return [raw as ProductEnricherField];
    }
    return null;
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > ALL_PRODUCT_ENRICHER_FIELDS.length) {
    return null;
  }
  const fields: ProductEnricherField[] = [];
  for (const item of raw) {
    if (!ALL_PRODUCT_ENRICHER_FIELDS.includes(item as ProductEnricherField)) return null;
    fields.push(item as ProductEnricherField);
  }
  return fields;
};

const parseContext = (raw: unknown): ProductEnricherContext | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const description = str((raw as { description?: unknown }).description).trim();
  if (!description) return undefined;
  if (description.length > MAX_CONTEXT_DESC) return undefined;
  return { description };
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    if (body?.healthCheck === true) {
      const hasKey = Boolean(Deno.env.get('DEEPSEEK_API_KEY')?.trim());

      // `probe` EXERCE la clé au lieu de constater sa présence. Une clé posée
      // mais sans crédit renvoie 402 « Insufficient Balance » : le contrôle
      // dirait « prêt » pendant que chaque génération échoue — c'est exactement
      // ce qui s'était produit sur le pipeline vision le 2026-08-24.
      //
      // Réservé au staff : la sonde consomme un appel payant, et cet endpoint
      // est joignable sans authentification pour la simple présence.
      if (body?.probe === true) {
        const staff = await assertAuthenticatedStaff(req);
        if (!staff.ok) return staffAuthJsonResponse(staff, corsHeaders);

        if (!hasKey) {
          return new Response(
            JSON.stringify({ ready: false, reason: 'missing_deepseek_key' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        try {
          await deepseekChatJson('Réponds uniquement {"ok":true}', { maxTokens: 20 });
          return new Response(JSON.stringify({ ready: true, probed: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (probeError) {
          const reason = probeError instanceof Error ? probeError.message : 'unknown';
          return new Response(
            JSON.stringify({
              ready: false,
              probed: true,
              reason,
              hint: reason.includes('402')
                ? 'Clé valide mais compte DeepSeek sans crédit.'
                : undefined,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      return new Response(JSON.stringify({ ready: hasKey, probed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const staff = await assertAuthenticatedStaff(req);
    if (!staff.ok) {
      return staffAuthJsonResponse(staff, corsHeaders);
    }

    const rateLimit = await assertAiRateLimit(req, 'ai-product-details', staff.userId);
    if (!rateLimit.allowed) {
      return rateLimitJsonResponse(rateLimit, corsHeaders);
    }

    const productName = str(body?.productName).trim();
    const category = str(body?.category).trim();
    if (!productName || productName.length > MAX_NAME_LEN) {
      return new Response(JSON.stringify({ error: 'productName requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!category || category.length > MAX_CATEGORY_LEN) {
      return new Response(JSON.stringify({ error: 'category requise' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fields = parseFields(body?.fields);
    if (fields === null) {
      return new Response(JSON.stringify({ error: 'fields invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const context = parseContext(body?.context);
    if (body?.context != null && context === undefined && str((body.context as { description?: unknown })?.description).trim()) {
      return new Response(JSON.stringify({ error: 'context.description trop long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildProductEnricherPrompt(productName, category, fields, context);
    const text = await deepseekChatJson(prompt, { maxTokens: 1600 });
    const details = parseProductEnricherOutput(text, fields);

    return new Response(JSON.stringify({ details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.error('[ai-product-details] failed', message, error);

    if (message === 'missing_deepseek_key') {
      return new Response(
        JSON.stringify({ error: 'DeepSeek non configuré côté serveur.', code: 'missing_deepseek_key' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const clientMessage = message.startsWith('deepseek_http_429')
      ? 'Quota DeepSeek atteint — réessayez dans quelques minutes.'
      : message.includes('JSON produit') || message.includes('vide')
        ? `Impossible de générer les détails : ${message}`
        : 'Impossible de générer les détails. Réessayez dans un instant.';

    return new Response(
      JSON.stringify({ error: clientMessage, code: message }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
