const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "bobby.mayert48@ethereal.email", 
    pass: "a9fURgfsmH72G311qk"             
   }
});

async function sendEmail(to, subject, text, html) {
  try {
    let info = await transporter.sendMail({
      from: '"My Shop" <bobby.mayert48@ethereal.email>',
      to,
      subject,
      text,
      
    });

    console.log("✅ Email sent!");
    return true;
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
    return false;
  }
}

module.exports = { sendEmail };
