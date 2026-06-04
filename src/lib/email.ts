// Provider-agnostic email abstraction.
// Set EMAIL_PROVIDER=resend (default) or EMAIL_PROVIDER=smtp in env.

type SendParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendParams): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "resend";

  if (provider === "resend") {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      to,
      subject,
      html,
    });
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
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    return;
  }

  console.warn(`[email] Unknown provider "${provider}". Email not sent to ${to}`);
}
