import { createTransport } from "npm:nodemailer@6.9.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAIL_PRIORITY = {
  priority: "high" as const,
  headers: {
    Importance: "high",
    "X-Priority": "1",
    Priority: "urgent",
    "X-MSMail-Priority": "High",
  },
};

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, msg: string, meta: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...meta,
    }),
  );
}

class HttpError extends Error {
  status: number;
  code: string;
  expose: boolean;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    opts?: { expose?: boolean; details?: Record<string, unknown> },
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = opts?.expose ?? false;
    this.details = opts?.details;
  }
}

function getRequestId(req: Request) {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err as any)?.code ? { code: (err as any).code } : {},
      ...(err as any)?.response ? { response: (err as any).response } : {},
      ...(err as any)?.responseCode
        ? { responseCode: (err as any).responseCode }
        : {},
      ...(err as any)?.command ? { command: (err as any).command } : {},
    };
  }
  return { message: String(err) };
}

async function parseJson(req: Request, requestId: string) {
  try {
    return await req.json();
  } catch (e) {
    log("warn", "Invalid JSON payload", { requestId, err: serializeError(e) });
    throw new HttpError(400, "INVALID_JSON", "Payload JSON invalide.", {
      expose: true,
    });
  }
}

function validatePayload(payload: any) {
  const { to, subject, html, text } = payload ?? {};

  if (!to || typeof to !== "string") {
    throw new HttpError(400, "INVALID_TO", "`to` doit être une string.", {
      expose: true,
      details: { gotType: typeof to },
    });
  }

  if (!subject || typeof subject !== "string") {
    throw new HttpError(400, "INVALID_SUBJECT", "`subject` doit être une string.", {
      expose: true,
      details: { gotType: typeof subject },
    });
  }

  const hasHtml = typeof html === "string" && html.trim().length > 0;
  const hasText = typeof text === "string" && text.trim().length > 0;

  if (!hasHtml && !hasText) {
    throw new HttpError(
      400,
      "MISSING_CONTENT",
      "Fournis `text` ou `html` (au moins l'un des deux).",
      { expose: true },
    );
  }

  if (to.length > 500) {
    throw new HttpError(400, "TO_TOO_LONG", "`to` est trop long.", { expose: true });
  }
  if (subject.length > 200) {
    throw new HttpError(400, "SUBJECT_TOO_LONG", "`subject` est trop long.", {
      expose: true,
    });
  }
  if (hasText && text.length > 200_000) {
    throw new HttpError(413, "TEXT_TOO_LARGE", "`text` est trop volumineux.", {
      expose: true,
      details: { max: 200_000, got: text.length },
    });
  }
  if (hasHtml && html.length > 300_000) {
    throw new HttpError(413, "HTML_TOO_LARGE", "`html` est trop volumineux.", {
      expose: true,
      details: { max: 300_000, got: html.length },
    });
  }

  return {
    to,
    subject,
    ...(hasText ? { text } : {}),
    ...(hasHtml ? { html } : {}),
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json",
    },
  });
}

function assertEnv(requestId: string) {
  const smtpPass = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPass) {
    log("error", "Missing SMTP_PASSWORD env var", { requestId });
    throw new HttpError(500, "CONFIG_MISSING", "Configuration serveur incomplète.", {
      expose: false,
    });
  }
  return { smtpPass };
}

function buildTransporter(smtpPass: string) {
  return createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: "support@xeptionetwork.shop",
      pass: smtpPass,
    },
  });
}

Deno.serve(async (req: Request) => {
  const requestId = getRequestId(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders, "x-request-id": requestId },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Méthode non autorisée. Utilisez POST.",
          requestId,
        },
      },
      405,
      { "x-request-id": requestId },
    );
  }

  const startedAt = Date.now();

  try {
    log("info", "Email request received", {
      requestId,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const payload = await parseJson(req, requestId);
    const { to, subject, text, html } = validatePayload(payload);
    const { smtpPass } = assertEnv(requestId);

    const transporter = buildTransporter(smtpPass);

    const info = await transporter.sendMail({
      from: '"Xeption Network" <support@xeptionetwork.shop>',
      to,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
      ...MAIL_PRIORITY,
    });

    log("info", "Email sent successfully", {
      requestId,
      durationMs: Date.now() - startedAt,
      toLen: to.length,
      subjectLen: subject.length,
      hasText: Boolean(text),
      hasHtml: Boolean(html),
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      response: info?.response,
    });

    return jsonResponse(
      { success: true, requestId, messageId: info?.messageId },
      200,
      { "x-request-id": requestId },
    );
  } catch (err) {
    const isHttp = err instanceof HttpError;
    const status = isHttp ? err.status : 500;
    const code = isHttp ? err.code : "INTERNAL_ERROR";

    log(status >= 500 ? "error" : "warn", "Email request failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      status,
      code,
      err: serializeError(err),
      ...(isHttp && err.details ? { details: err.details } : {}),
    });

    const message =
      isHttp && err.expose
        ? err.message
        : "Une erreur est survenue lors de l'envoi de l'email.";

    return jsonResponse(
      {
        success: false,
        error: { code, message, requestId },
      },
      status,
      { "x-request-id": requestId },
    );
  }
});
