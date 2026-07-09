// Provider-agnostic email abstraction.
// Set EMAIL_PROVIDER=resend (default) or EMAIL_PROVIDER=smtp in env.

type SendParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

export async function sendEmail({ to, subject, html, text, metadata, idempotencyKey }: SendParams): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "resend";

  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send(
      {
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      to,
      subject,
      html,
      text,
      tags: metadata
        ? Object.entries(metadata)
            .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
            .slice(0, 10)
            .map(([name, value]) => ({ name, value: String(value) }))
        : undefined,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (result.error) {
      throw new Error(result.error.message || "Resend email delivery failed");
    }
    return;
  }

  if (provider === "smtp") {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text });
    return;
  }

  console.warn(`[email] Unknown provider "${provider}". Email not sent to ${to}`);
}
