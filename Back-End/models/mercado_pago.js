const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN 
});

// Crear instancia de Preference
const preference = new Preference(client);

const crearPreferencia = async (datos) => {
    try {
        // Base del front-end para las URLs de retorno (local o producción)
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
        // URL pública del webhook (en local, la URL de ngrok; en prod, tu dominio del backend)
        const NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;

        const preferenceData = {
            items: [
                {
                    title: datos.title,
                    quantity: 1,
                    unit_price: Number(datos.price),
                    currency_id: 'MXN'
                }
            ],
            external_reference: datos.idUser,

            // -----------------------------------------------------
            // METADATA: Información oculta que viaja con el pago
            // -----------------------------------------------------
            metadata: {
                appointment_id: datos.appointmentId
            },

            back_urls: {
                success: `${FRONTEND_URL}/calendar`,
                failure: `${FRONTEND_URL}/calendar`,
                pending: `${FRONTEND_URL}/calendar`
            },

            // -----------------------------------------------------
            // WEBHOOK: A dónde llama MP cuando cambia el estado del pago.
            // En local: URL de ngrok (MP_NOTIFICATION_URL en .env).
            // En prod: la URL pública de tu backend.
            // -----------------------------------------------------
            ...(NOTIFICATION_URL ? { notification_url: NOTIFICATION_URL } : {}),

            //auto_return: "approved"
        };

        const result = await preference.create({ body: preferenceData });

        return {
            id: result.id,
            init_point: result.init_point
        };

    } catch (error) {
        console.error("Error creando preferencia:", error);
        throw error;
    }
};

module.exports = {
    crearPreferencia
};