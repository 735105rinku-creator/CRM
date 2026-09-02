import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const normalizeSmtpPassword = (value = "") => String(value).replace(/\s+/g, "").trim();

const createTransporter = ({ host, port, secure, user, pass }) => {
  const normalizedPass = normalizeSmtpPassword(pass);

  if (!host || !user || !normalizedPass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port || 587),
    secure: secure === undefined ? Number(port || 587) === 465 : Boolean(secure),
    auth: {
      user: String(user).trim(),
      pass: normalizedPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: env.NODE_ENV === "production",
    },
  });
};

const platformTransporter = createTransporter({
  host: env.SUPER_ADMIN_SMTP_HOST,
  port: env.SUPER_ADMIN_SMTP_PORT,
  secure: env.SUPER_ADMIN_SMTP_SECURE,
  user: env.SUPER_ADMIN_SMTP_USER,
  pass: env.SUPER_ADMIN_SMTP_PASS,
});

const defaultTransporter = createTransporter({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
});

const getTransport = (scope = "platform") => {
  if (["platform", "super_admin"].includes(scope)) {
    return platformTransporter || defaultTransporter;
  }

  return defaultTransporter || platformTransporter;
};

const getFromAddress = (scope = "platform") => {
  if (["platform", "super_admin"].includes(scope)) {
    return env.SUPER_ADMIN_SMTP_FROM || `Opas Bizz pvt ltd <${env.SUPER_ADMIN_SMTP_USER}>`;
  }

  return env.SMTP_FROM || `${env.APP_NAME || "OPAS BIZZ CRM"} <${env.SMTP_USER || env.SUPER_ADMIN_SMTP_USER}>`;
};

const platformBrand = {
  name: "Opas Bizz pvt ltd",
  logoUrl: env.SUPER_ADMIN_MAIL_LOGO_URL,
};

const platformMailShell = ({ title, preheader, body, ctaLabel, ctaUrl }) => `<!DOCTYPE html>
<html>
<body style="margin:0;background:#edf4ff;font-family:Arial,Helvetica,sans-serif;color:#172033">
  <div style="display:none;max-height:0;overflow:hidden">${preheader || title}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#21083f 0%,#5724bd 38%,#057b7d 72%,#c5164f 100%);padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.28)">
          <tr>
            <td style="height:8px;background:linear-gradient(90deg,#dc2626,#f59e0b,#059669,#0284c7)"></td>
          </tr>
          <tr>
            <td style="padding:28px 30px 8px">
              <img src="${platformBrand.logoUrl}" alt="${platformBrand.name}" style="max-width:160px;height:auto;background:#f8fafc;border-radius:8px;padding:8px;border:1px solid #e2e8f0" />
              <p style="text-transform:uppercase;letter-spacing:0;font-size:12px;font-weight:800;color:#6d28d9;margin:22px 0 8px">${platformBrand.name}</p>
              <h1 style="font-size:32px;line-height:1.1;margin:0;color:#111827">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 30px 8px">${body}</td>
          </tr>
          <tr>
            <td style="padding:16px 30px 30px">
              <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#4c1d95,#047857,#be123c);color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:8px">${ctaLabel}</a>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:22px 0 0">Button work na kare to link copy kare:<br><span style="word-break:break-all;color:#334155">${ctaUrl}</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const isEmailAuthError = (error) => {
  return ["EAUTH", "535", 535].includes(error?.code) || error?.responseCode === 535 || /535|badcredentials|username and password not accepted/i.test(error?.message || "");
};
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  required = false,
  scope = "platform",
}) => {
  if (!to) {
    throw new Error(`Email recipient is required for subject: "${subject}".`);
  }

  const selectedTransporter = getTransport(scope);

  if (!selectedTransporter) {
    if (required) {
      throw new Error(
        `SMTP is not configured. Cannot send required email to ${to} — subject: "${subject}". ` +
          "Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file."
      );
    }

    console.warn("[email] SMTP not configured. Email skipped.");
    console.warn({ to, subject, text });
    return { skipped: true };
  }

  let result;

  try {
    result = await selectedTransporter.sendMail({
      from: getFromAddress(scope),
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("[email] Send failed", {
      to,
      subject,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message,
    });
    throw error;
  }

  console.log("[email] Sent", {
    to,
    subject,
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
  });

  return result;
};

export const sendResetPasswordEmail = async ({ to, name, resetUrl }) => {
  return sendEmail({
    to,
    subject: `${platformBrand.name} - Reset your password`,
    text: `Hello ${name || "User"}, reset your password using this link: ${resetUrl}`,
    html: platformMailShell({
      title: "Reset your password",
      preheader: "Use this secure link to create a new password for your Opas Bizz CRM account.",
      ctaLabel: "Reset Password",
      ctaUrl: resetUrl,
      body: `
        <p style="font-size:16px;line-height:1.65;margin:0 0 12px">Hello <strong>${name || "User"}</strong>,</p>
        <p style="color:#334155;font-size:15px;line-height:1.7;margin:0">We received a request to reset your password. This secure link expires in <strong>15 minutes</strong>.</p>
        <div style="background:linear-gradient(135deg,#f8fafc,#ecfeff);border:1px solid #dbeafe;border-radius:8px;margin:20px 0;padding:16px">
          <strong style="color:#4c1d95">Security note</strong>
          <p style="color:#475569;line-height:1.6;margin:8px 0 0">If you did not request this, ignore this email. Your current password will remain active.</p>
        </div>
      `,
    }),
    required: true,
    scope: "super_admin",
  });
};

export const sendVerificationEmail = async ({
  to,
  name,
  verifyUrl,
  verificationUrl,
  companyDetails = null,
}) => {
  const finalVerifyUrl = verifyUrl || verificationUrl;

  if (!finalVerifyUrl) {
    throw new Error("Verification URL is required.");
  }

  const companyBlock = companyDetails
    ? `
  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
    <p style="margin:0 0 8px"><strong>Company Name:</strong> ${companyDetails.companyName || "-"}</p>
    <p style="margin:0 0 8px"><strong>Company Code:</strong> ${companyDetails.companyCode || "-"}</p>
    <p style="margin:0 0 8px"><strong>Admin Full Name:</strong> ${companyDetails.adminName || name || "-"}</p>
    <p style="margin:0 0 8px"><strong>Admin Mobile:</strong> ${companyDetails.adminMobile || "-"}</p>
    <p style="margin:0 0 8px"><strong>Company Phone:</strong> ${companyDetails.companyPhone || "-"}</p>
    <p style="margin:0"><strong>Country:</strong> ${companyDetails.country || "-"}</p>
  </div>
`
    : "";

  const companyText = companyDetails
    ? ` Company: ${companyDetails.companyName || "-"} (${companyDetails.companyCode || "-"}). Admin: ${companyDetails.adminName || name || "-"}, Mobile: ${companyDetails.adminMobile || "-"}.`
    : "";

  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Verify your email`,
    text: `Hello ${name || "User"}, verify your email using this link: ${finalVerifyUrl}.${companyText}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Verify Your Email</h2>
  <p>Hello ${name || "User"},</p>

  <p>Your OPAS BIZZ CRM account has been created successfully.</p>
  <p>Please verify your registered email address to activate your account.</p>

  ${companyBlock}

  <p style="margin:24px 0">
    <a href="${finalVerifyUrl}"
       style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Verify Email
    </a>
  </p>

  <p style="color:#666;font-size:13px">
    If the button doesn't work, copy this link:<br>
    <span style="word-break:break-all">${finalVerifyUrl}</span>
  </p>

  <p style="color:#666;font-size:13px">
    If you did not expect this email, please contact your administrator.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: true,
  });
};

export const sendUnlockEmail = async ({ to, name, unlockUrl }) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Unlock your account`,
    text: `Hello ${name || "User"}, unlock your account using this link: ${unlockUrl}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Account Locked</h2>
  <p>Hello ${name || "User"},</p>
  <p>Your account was locked after multiple failed login attempts.</p>
  <p>Click the button below to unlock your account. This link expires in <strong>30 minutes</strong>.</p>
  <p style="margin:24px 0">
    <a href="${unlockUrl}"
       style="background:#DC2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Unlock Account
    </a>
  </p>
  <p style="color:#666;font-size:13px">If the button doesn't work, copy this link:<br>${unlockUrl}</p>
  <p style="color:#666;font-size:13px">If this wasn't you, contact your administrator immediately.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: true,
  });
};

export const sendWelcomeEmployeeEmail = async ({
  to,
  name,
  employeeCode,
  temporaryPassword,
  loginUrl,
  verifyUrl,
}) => {
  const verificationBlock = verifyUrl
    ? `
  <p><strong>Step 1:</strong> Verify your email address.</p>

  <p style="margin:24px 0">
    <a href="${verifyUrl}"
       style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Verify Email
    </a>
  </p>

  <p style="color:#666;font-size:13px">
    Verification link:<br>
    <span style="word-break:break-all">${verifyUrl}</span>
  </p>

  <p><strong>Step 2:</strong> After verification, login using your official email and temporary password.</p>
`
    : `
  <p>Please login using your official email and temporary password.</p>
`;

  const textVerification = verifyUrl
    ? `Verify Email: ${verifyUrl}. `
    : "";

  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Welcome to the HR Portal`,
    text: `Hello ${name || "User"}, your employee account has been created. Employee Code: ${employeeCode}. ${textVerification}Login: ${loginUrl}. Temporary Password: ${temporaryPassword}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Welcome to ${env.APP_NAME}</h2>
  <p>Hello ${name || "User"},</p>
  <p>Your employee account has been created successfully.</p>

  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
    <p><strong>Employee Code:</strong> ${employeeCode}</p>
    <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
  </div>

  ${verificationBlock}

  <p style="margin:24px 0">
    <a href="${loginUrl}"
       style="background:#16A34A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Login Now
    </a>
  </p>

  <p>Please login and change your password immediately.</p>

  <p style="color:#666;font-size:13px">
    If you did not expect this email, please contact your HR team.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: true,
  });
};

export const sendAdminPasswordResetEmail = async ({
  to,
  name,
  temporaryPassword,
  loginUrl,
  resetByName,
}) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Your password has been reset`,
    text: `Hello ${name || "User"}, your password has been reset by ${resetByName || "your administrator"}. Login: ${loginUrl}. Temporary Password: ${temporaryPassword}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Password Reset by Administrator</h2>

  <p>Hello ${name || "User"},</p>

  <p>Your password has been reset by <strong>${resetByName || "your administrator"}</strong>.</p>

  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
    <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
  </div>

  <p>Please login using this temporary password and change your password immediately.</p>

  <p style="margin:24px 0">
    <a href="${loginUrl}"
       style="background:#16A34A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Login Now
    </a>
  </p>

  <p style="color:#666;font-size:13px">
    If you did not expect this email, please contact your HR/Admin team immediately.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: true,
  });
};


