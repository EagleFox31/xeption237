import { createTransport } from "npm:nodemailer@6.9.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using Deno.serve as recommended for Supabase Edge Functions
// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    // Vérification basique des données
    if (!to || !subject || !html) {
      throw new Error("Champs manquants (to, subject, html)");
    }

    // @ts-ignore
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      console.error("ERREUR CRITIQUE: Variable d'environnement SMTP_PASSWORD manquante dans Supabase.");
      throw new Error("Configuration serveur incomplète (Secret manquant).");
    }

    // SMTP configuration (Hostinger)
    const transporter = createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'support@xeptionetwork.shop',
        pass: smtpPassword,
      },
    });

    console.log(`[Send-Invoice] Tentative d'envoi de mail à ${to} via Hostinger...`);

    const info = await transporter.sendMail({
      from: '"Xeption Network" <support@xeptionetwork.shop>',
      to,
      subject,
      html,
    });

    console.log("[Send-Invoice] Succès ! Message ID :", info.messageId);

    return new Response(JSON.stringify({ success: true, info }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Send-Invoice] ERREUR:", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});