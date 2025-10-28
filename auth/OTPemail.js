const nodemailer = require("nodemailer"); 
 


async function sendEmail(to, OTP) {
  try {
 let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "yassefsea274@gmail.com", // بريدك الحقيقي
        pass: "vyobfqfeuiiepivu"       // استخدم App Password بدون فراغات
      }
    });

    let info = await transporter.sendMail({
      from: '"My Shop" <yassefsea274@gmail.com>',
      to,
      subject: "Email Verification",
      text: `Your verification code is: ${OTP}`,
     
    });
    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
module.exports = { sendEmail };