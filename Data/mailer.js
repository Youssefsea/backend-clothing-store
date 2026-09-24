require("dotenv").config();
const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const fromAddress = process.env.RESEND_FROM_EMAIL;

const sendEmail = async (to, subject, html) => {
  if (!resend || !fromAddress) {
    throw new Error("Resend configuration is missing");
  }

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email delivery failed:", error);
    throw new Error("Email delivery failed");
  }

  return data;
};

module.exports = { sendEmail };
