const nodemailer = require('nodemailer');
// Opcional, pero buena práctica si lo corres localmente y dotenv no está en el index
require('dotenv').config();

// =================================================================================
// Envío de correos con dos proveedores:
//  - 'resend': API HTTP de Resend (https://resend.com). Úsalo en Render gratis,
//    que bloquea las conexiones SMTP salientes.
//  - 'smtp'  : Gmail con Nodemailer (contraseña de aplicación), útil en local.
// Se elige con EMAIL_PROVIDER; si no está definido se usa 'resend' cuando hay
// RESEND_API_KEY y 'smtp' en otro caso.
//
// enviarCorreoSMTP NUNCA lanza ni rechaza: devuelve { ok, message }. Así los
// controladores pueden llamarlo sin await (fire-and-forget) sin frenar la
// respuesta ni tumbar el proceso.
// =================================================================================

// Tiempo máximo para hablar con el proveedor (evita peticiones colgadas)
const EMAIL_TIMEOUT_MS = 10 * 1000;

const getProvider = () => (
    process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp')
).toLowerCase();

// Remitente: EMAIL_FROM (ej. "Dental One <citas@tudominio.com>") o la cuenta de Gmail
const getFrom = () => process.env.EMAIL_FROM || `"Dental One" <${process.env.EMAIL_USER}>`;

// Inicializaremos el transporter de manera "lazy" (justo cuando se necesite)
// para garantizar que process.env ya haya cargado todas sus variables.
let transporter = null;

function getTransporter() {
    if (!transporter) {
        // Validamos si llegaron las variables antes de pasarlas a Nodemailer
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("ERROR CRÍTICO: EMAIL_USER o EMAIL_PASS son undefined en process.env");
        }

        // IMPORTANTE: Si pegaste la contraseña de Google con espacios (ej: "abcd efgh ijkl mnop"),
        // Nodemailer puede fallar. Reemplazamos los espacios para que quede como un solo string continuo.
        const cleanPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: cleanPass,
            },
            // Sin estos límites, un SMTP bloqueado deja la conexión colgada varios minutos
            connectionTimeout: EMAIL_TIMEOUT_MS,
            greetingTimeout: EMAIL_TIMEOUT_MS,
            socketTimeout: 2 * EMAIL_TIMEOUT_MS,
        });
    }
    return transporter;
}

async function enviarConSMTP({ to, subject, html }) {
    const info = await getTransporter().sendMail({ from: getFrom(), to, subject, html });
    return info.messageId;
}

async function enviarConResend({ to, subject, html }) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('Falta la variable de entorno RESEND_API_KEY.');
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: getFrom(), to: [to], subject, html }),
        signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`Resend respondió ${response.status}: ${data.message || JSON.stringify(data)}`);
    }
    return data.id;
}

async function enviarCorreoSMTP({ to, subject, html }) {
    const provider = getProvider();
    try {
        const id = provider === 'resend'
            ? await enviarConResend({ to, subject, html })
            : await enviarConSMTP({ to, subject, html });
        console.log(`Correo enviado (${provider}) a ${to}:`, id);
        return { ok: true };
    } catch (error) {
        console.error(`Error al enviar correo (${provider}) a ${to}:`, error.message || error);
        return { ok: false, message: error };
    }
}

module.exports = {
    enviarCorreoSMTP,
};
