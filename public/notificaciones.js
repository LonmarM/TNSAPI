const axios = require('axios');

async function sendWhatsAppMessage(text) {
  const phone = process.env.CALLMEBOT_PHONE;     // Ej: +521XXXXXXXXXX
  const apikey = process.env.CALLMEBOT_APIKEY;   // Te lo da CallMeBot

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${apikey}`;

  try {
    const response = await axios.get(url);
    console.log(`[WhatsApp] Mensaje enviado: ${response.data}`);
  } catch (error) {
    console.error('[WhatsApp] Error al enviar mensaje:', error.response?.data || error.message);
  }
}

module.exports = { sendWhatsAppMessage };
