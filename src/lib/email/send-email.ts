export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  provider: "resend";
  messageId?: string;
};

export class EmailConfigurationError extends Error {
  code = "EMAIL_CONFIG_MISSING" as const;

  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

function resolveFromEmail(): string {
  const from =
    process.env.CAPACITACION_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.FROM_EMAIL ||
    "";

  const normalized = from.trim();
  if (!normalized) {
    throw new EmailConfigurationError(
      "No hay remitente configurado para correo. Define CAPACITACION_FROM_EMAIL o EMAIL_FROM.",
    );
  }

  return normalized;
}

function resolveResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new EmailConfigurationError(
      "No hay proveedor de correo configurado. Define RESEND_API_KEY para enviar correos reales.",
    );
  }
  return apiKey;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resendApiKey = resolveResendApiKey();
  const fromEmail = resolveFromEmail();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const payloadText = await response.text();
  if (!response.ok) {
    throw new Error(
      `No fue posible enviar correo (${response.status}): ${payloadText || "sin detalle"}`,
    );
  }

  let messageId: string | undefined;
  try {
    const parsed = JSON.parse(payloadText) as { id?: string };
    messageId = parsed.id;
  } catch {
    messageId = undefined;
  }

  return {
    provider: "resend",
    messageId,
  };
}
