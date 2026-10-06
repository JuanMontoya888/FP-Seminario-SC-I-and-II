const twilio = require('twilio');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.fromNumber = null;

        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            // Twilio Sandbox para WhatsApp requiere el formato "whatsapp:+1..."
            this.fromNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
        }
    }

    /**
     * Envía un recordatorio de cita por WhatsApp.
     * @param {string} to - Número del paciente (debe estar en la Sandbox de Twilio, p.ej. '+521234567890')
     * @param {object} appointmentDetails - Detalles de la cita
     */
    async sendAppointmentReminder(to, appointmentDetails) {
        if (!this.client) {
            console.warn('⚠️ Twilio no está configurado. No se envió el mensaje de WhatsApp.');
            return false;
        }

        const { patientName, date, time, providerName, link } = appointmentDetails;

        // Limpiar número destino y añadir prefijo whatsapp:
        let toWhatsApp = to;
        if (!toWhatsApp.startsWith('+')) {
            // Asumimos código de país +52 para México si no tiene código (Ajustable según el país)
            toWhatsApp = `+52${toWhatsApp}`;
        }
        
        // Plantilla interactiva del mensaje (CDONE-39 y CDONE-40)
        const messageBody = `¡Hola *${patientName}*! 👋\n\n` +
            `Este es un recordatorio de tu cita en *Dental One* con *${providerName}*.\n\n` +
            `📅 *Fecha:* ${date}\n` +
            `⏰ *Hora:* ${time}\n\n` +
            `Puedes revisar los detalles de tu cita y tu historial clínico en el siguiente enlace:\n` +
            `${link}\n\n` +
            `Si necesitas cancelar o reprogramar, por favor contáctanos.\n` +
            `¡Te esperamos con una sonrisa! 😁`;

        try {
            const message = await this.client.messages.create({
                from: this.fromNumber,
                body: messageBody,
                to: `whatsapp:${toWhatsApp}`
            });
            console.log(`✅ WhatsApp enviado con éxito al número ${toWhatsApp} (SID: ${message.sid})`);
            return true;
        } catch (error) {
            console.error(`❌ Error enviando WhatsApp a ${toWhatsApp}:`, error.message);
            return false;
        }
    }
}

module.exports = new WhatsAppService();
