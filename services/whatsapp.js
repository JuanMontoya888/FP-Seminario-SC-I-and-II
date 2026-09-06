const twilio = require('twilio');
// Opcional, pero buena práctica si lo corres localmente y dotenv no está en el index
require('dotenv').config();

// Inicializaremos el cliente de manera "lazy" (justo cuando se necesite)
// para garantizar que process.env ya haya cargado todas sus variables.
let client = null;

async function enviarWhatsapp({ to, body }) {
    if (!client) {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.error('ERROR CRÍTICO: TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN son undefined en process.env');
            return { ok: false, message: 'Twilio no configurado' };
        }

        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    if (!to) {
        return { ok: false, message: 'Falta número de destino' };
    }

    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!from) {
        console.error('ERROR CRÍTICO: TWILIO_WHATSAPP_FROM no está definido');
        return { ok: false, message: 'Falta TWILIO_WHATSAPP_FROM' };
    }

    // Twilio requiere el prefijo "whatsapp:" tanto en origen como en destino
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    try {
        const msg = await client.messages.create({
            from,
            to: toFormatted,
            body,
        });
        console.log('WhatsApp enviado:', msg.sid);
        return { ok: true, sid: msg.sid };
    } catch (error) {
        console.error('Error al enviar WhatsApp:', error);
        return { ok: false, message: error.message || error };
    }
}

module.exports = {
    enviarWhatsapp,
};
