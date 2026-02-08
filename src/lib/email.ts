type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

async function sendWithResend(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Falta RESEND_API_KEY o EMAIL_FROM para enviar correos con Resend.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error: ${res.status} ${body}`);
  }
}

export async function sendEmail(input: SendEmailInput) {
  // MVP: preferimos Resend cuando esté configurado. Si no hay credenciales,
  // dejamos el flujo listo y logueamos server-side.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn("[EMAIL][TODO] Configura RESEND_API_KEY y EMAIL_FROM. Email no enviado:", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }
  await sendWithResend(input);
}

export function financeEmail(): string | null {
  const v = process.env.FINANCE_EMAIL?.trim();
  return v ? v : null;
}

