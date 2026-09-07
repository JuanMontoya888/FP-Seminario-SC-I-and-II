const Contact = require('../models/contact');
const { enviarCorreoSMTP } = require('../services/mailer');
const emailTemplates = require('../services/emailTemplates');

const submitContactForm = async (req, res) => {
    try {
        const { nombre, email, celular, asunto, mensaje } = req.body;
        const userId = req.user.id;

        // 1. Guardar en base de datos
        const newContact = new Contact({
            user: userId,
            nombre,
            email,
            celular,
            asunto,
            mensaje
        });
        await newContact.save();

        // 2. Enviar correo al administrador de la clínica
        try {
            await enviarCorreoSMTP({
                to: process.env.EMAIL_USER, // El mismo correo de la clínica recibe las notificaciones
                subject: `Nuevo mensaje de contacto: ${asunto} - Dental One`,
                html: emailTemplates.contactoAdmin({ nombre, email, celular, asunto, mensaje })
            });
            console.log('Correo de notificación al admin enviado exitosamente.');
        } catch (mailErr) {
            console.error('Error enviando correo de contacto al admin:', mailErr);
        }

        // 3. Enviar acuse de recibo automático al paciente
        try {
            await enviarCorreoSMTP({
                to: email,
                subject: 'Hemos recibido tu mensaje - Dental One',
                html: emailTemplates.contactoPaciente(nombre)
            });
            console.log('Correo de acuse al paciente enviado exitosamente.');
        } catch (mailErr) {
            console.error('Error enviando correo de acuse al paciente:', mailErr);
        }

        // 4. Responder al cliente
        res.status(201).json({ msg: 'Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.' });

    } catch (err) {
        console.error('Error procesando formulario de contacto:', err);
        res.status(500).json({ msg: 'Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.' });
    }
};

module.exports = { submitContactForm };
