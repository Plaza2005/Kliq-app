import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? "smtp.gmail.com",
  port:   parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
});

const FROM = process.env.EMAIL_FROM ?? "KLIQ <noreply@kliq.app>";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Verify your KLIQ email",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#7c3aed;">Verify your email</h2>
        <p>Click the button below to verify your KLIQ account.</p>
        <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Link expires in 24 hours. If you didn't register, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your KLIQ password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#7c3aed;">Reset your password</h2>
        <p>Click the button below to set a new password for your KLIQ account.</p>
        <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
