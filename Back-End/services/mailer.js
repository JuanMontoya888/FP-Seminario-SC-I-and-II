const nodemailer = require('nodemailer');
// Opcional, pero buena práctica si lo corres localmente y dotenv no está en el index
require('dotenv').config(); 

// Inicializaremos el transporter de manera "lazy" (justo cuando se necesite)
// para garantizar que process.env ya haya cargado todas sus variables.
let transporter = null;

async function enviarCorreoSMTP({ to, subject, html }) {
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
        });
    }

    const mailOptions = {
        from: `"Dental One" <${process.env.EMAIL_USER}>`, // Actualizado a Dental One
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado:', info.messageId);
        return { ok: true };
    } catch (error) {
        console.error('Error al enviar correo:', error);
        return { ok: false, message: error };
    }
}

module.exports = {
    enviarCorreoSMTP,
};