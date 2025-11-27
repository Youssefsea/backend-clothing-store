const nodemailer = require("nodemailer"); 
  require('dotenv').config();
 


async function sendEmail(to, OTP) {
  try {
 let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER, 
        pass: process.env.GMAIL_PASS
      }
    });

    let info = await transporter.sendMail({
      from: '"My Shop" <yassefsea274@gmail.com>',
      to,
      subject: "Email Verification",
      text: `your OTP is: ${OTP}`,

    });
    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
module.exports = { sendEmail };