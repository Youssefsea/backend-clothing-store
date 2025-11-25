const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yassefsea274@gmail.com", 
    pass: "vyobfqfeuiiepivu"             
   }
});

async function sendEmail(to, subject, text, html) {
  try {
    let info = await transporter.sendMail({
      from: '"My Shop" <yassefsea274@gmail.com>',
      to,
      subject,
      text,
      html
    });

    console.log("✅ Email sent!");
    return true;
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
    return false;
  }
}

module.exports = { sendEmail };
