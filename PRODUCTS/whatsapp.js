// whatsapp.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: false },
});

client.on("qr", (qr) => {
  console.log("امسح الـ QR من واتساب (Linked Devices):");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp Client Ready!");
});

client.initialize();

async function sendWhatsAppMessage(phone, message) {
  try {
    const chatId = `${phone}@c.us`;
    await client.sendMessage(chatId, message);
    console.log(`✅ تم إرسال الرسالة إلى ${phone}: ${message}`);
  } catch (err) {
    console.error("❌ فشل إرسال رسالة واتساب:", err);
  }
}

module.exports = { sendWhatsAppMessage };
