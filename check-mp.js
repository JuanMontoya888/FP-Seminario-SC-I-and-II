require('dotenv').config();
const { MercadoPagoConfig, Payment } = require('mercadopago');

async function checkMP() {
    try {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const paymentClient = new Payment(client);
        
        const paymentId = '166947280360'; // El ID que proporciono el usuario
        const paymentInfo = await paymentClient.get({ id: paymentId });
        
        console.log("=== DATOS DEL PAGO EN MERCADO PAGO ===");
        console.log(`Estado: ${paymentInfo.status}`);
        console.log(`Monto: ${paymentInfo.transaction_amount}`);
        console.log(`Descripción: ${paymentInfo.description}`);
        console.log(`Metadata:`, paymentInfo.metadata);
        
        process.exit(0);
    } catch (err) {
        console.error("Error al consultar MP:", err.message);
        process.exit(1);
    }
}
checkMP();
