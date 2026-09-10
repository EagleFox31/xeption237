import { supabase } from './supabaseClient';
import type {
  ProductEnricherContext,
  ProductEnricherField,
  ProductEnricherOutput,
} from './personas/productEnricher';

const parsePayload = (data: unknown): Record<string, unknown> | null =>
  data && typeof data === 'object' ? (data as Record<string, unknown>) : null;

/** Génère un ou plusieurs champs produit via Edge Function staff (DeepSeek côté serveur). */
export async function generateProductDetails(
  productName: string,
  category: string,
  fields?: ProductEnricherField | ProductEnricherField[] | 'all',
  context?: ProductEnricherContext,
): Promise<Partial<ProductEnricherOutput>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Connectez-vous à l’ERP pour utiliser l’auto-fill IA.');
  }

  const { data, error } = await supabase.functions.invoke('ai-product-details', {
    body: {
      productName,
      category,
      fields: fields ?? 'all',
      context,
    },
  });

  const payload = parsePayload(data);

  if (payload?.code === 'rate_limited') {
    throw new Error('Trop de requêtes IA — patientez quelques minutes.');
  }

  if (payload?.details && typeof payload.details === 'object') {
    return payload.details as Partial<ProductEnricherOutput>;
  }

  if (error) {
    const contextPayload = parsePayload((error as { context?: unknown }).context);
    const serverError = typeof contextPayload?.error === 'string'
      ? contextPayload.error
      : typeof payload?.error === 'string'
        ? payload.error
        : null;
    console.error('[aiProductDetailsService] invoke_failed', error);
    throw new Error(
      serverError || 'Impossible de générer les détails. Vérifiez votre connexion.',
    );
  }

  const serverError = typeof payload?.error === 'string' ? payload.error : null;
  throw new Error(serverError || 'Impossible de générer les détails.');
}
