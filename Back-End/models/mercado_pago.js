const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN 
});

// Crear instancia de Preference
const preference = new Preference(client);

/**
 * Crea una preferencia de Checkout Pro.
 * @param {object} datos { title, amount, appointmentId, userId } — el monto ya viene
 *                       calculado por el servidor (mercado_pago.controller.js).
 */
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
                    unit_price: Number(datos.amount),
                    currency_id: 'MXN'
                }
            ],
            // ID del usuario autenticado (req.user.id), no el que mande el cliente
            external_reference: datos.userId,

            // -----------------------------------------------------
            // METADATA: Información oculta que viaja con el pago
            // -----------------------------------------------------
            metadata: {
                appointment_id: datos.appointmentId,
                expected_amount: Number(datos.amount)
            },

            back_urls: {
                success: `${FRONTEND_URL}/pago-exitoso`,
                failure: `${FRONTEND_URL}/pago-exitoso`,
                pending: `${FRONTEND_URL}/pago-exitoso`
            },

            // auto_return solo funciona con URLs públicas (no localhost).
            // En producción, FRONTEND_URL apunta a un dominio real y se activa.
            ...(!FRONTEND_URL.includes('localhost') ? { auto_return: 'approved' } : {}),

            ...(NOTIFICATION_URL ? { notification_url: NOTIFICATION_URL } : {}),

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