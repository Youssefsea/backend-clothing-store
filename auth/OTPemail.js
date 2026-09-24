const { sendEmail: deliverEmail } = require("../Data/mailer");

async function sendEmail(to, OTP) {
  const info = await deliverEmail(
    to,
    "تأكيد البريد الإلكتروني",
    `<div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;line-height:1.8;color:#222">
      <h2>تأكيد البريد الإلكتروني</h2>
      <p>رمز التحقق الخاص بك هو:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center">${OTP}</p>
      <p>ينتهي هذا الرمز خلال 60 ثانية.</p>
      <p style="color:#666">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
    </div>`
  );
  console.log("Email sent:", info?.id);
}
module.exports = { sendEmail };