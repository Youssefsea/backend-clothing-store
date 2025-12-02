const nodemailer = require("nodemailer"); 
  require('dotenv').config();
 


async function sendEmail(to, OTP) {
  try {
   const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "yassefsea274@gmail.com",       
        pass: "vjgf odiu nnul krpg"   
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