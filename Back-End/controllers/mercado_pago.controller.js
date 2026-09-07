const modelMP = require('../models/mercado_pago');
const Appointment = require('../models/scheduling');
const User = require('../models/users');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Importamos el mailer y los templates
const { enviarCorreoSMTP } = require('../services/mailer');
const emailTemplates = require('../services/emailTemplates');

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentClient = new Payment(client);


const val = (req, res) => {
    res.send('Hola desde vista MP');
}

const proccesPay = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user.id; // Disponible gracias al authMiddleware

        // Validar que el appointmentId exista y pertenezca al usuario
        if (data.appointmentId) {
            const appointment = await Appointment.findById(data.appointmentId);

            if (!appointment) {
                return res.status(404).json({ msg: 'La cita no fue encontrada.' });
            }

            if (String(appointment.user) !== String(userId)) {
                return res.status(403).json({ msg: 'No tienes permiso para pagar esta cita.' });
            }

            if (['Confirmed', 'Canceled'].includes(appointment.status)) {
                return res.status(400).json({ msg: 'Esta cita ya fue pagada o cancelada.' });
            }
        }

        // Crear la preferencia en Mercado Pago
        const preferences = await modelMP.crearPreferencia(data);

        res.json(preferences);
    } catch (error) {
        console.log(error);
        res.status(500).send("Error al crear preferencia");
    }
}

const receiveWebhook = async (req, res) => {
    try {
        const paymentId = req.query['data.id'] || req.body?.data?.id;
        const type = req.query.type || req.body?.type;

        if (type === 'payment' && paymentId) {
            // Consultamos el estado real del pago
            const paymentInfo = await paymentClient.get({ id: paymentId });
            const appointmentId = paymentInfo.metadata.appointment_id;

            if (appointmentId) {
                // Evaluamos el ESTADO del pago que nos devuelve Mercado Pago
                switch (paymentInfo.status) {
                    case 'approved':
                        // CASO: APRO (Pago aprobado)
                        const citaPagada = await Appointment.findByIdAndUpdate(
                            appointmentId,
                            { status: 'Confirmed' },
                            { new: true }
                        );
                        console.log(`Pago APROBADO. Cita ${appointmentId} confirmada.`);

                        // El paciente nuevo ya pagó su primera cita en línea:
                        // se desbloquea para que pueda pagar en clínica a futuro.
                        if (citaPagada?.user) {
                            await User.findByIdAndUpdate(citaPagada.user, { canPayAtClinic: true });
                            console.log(`Usuario ${citaPagada.user} habilitado para pagar en clinica.`);
                        }

                        // Enviar correo de confirmación de pago al paciente
                        if (citaPagada) {
                            try {
                                const usuario = await User.findById(citaPagada.user);
                                if (usuario) {
                                    const monto = paymentInfo.transaction_amount || 0;
                                    const concepto = paymentInfo.description || citaPagada.reason || 'Cita dental';
                                    await enviarCorreoSMTP({
                                        to: usuario.email,
                                        subject: 'Comprobante de pago - Dental One',
                                        html: emailTemplates.pagoRecibido(usuario.nombre, monto, concepto)
                                    });
                                    console.log(`Correo de pago enviado a ${usuario.email}`);
                                }
                            } catch (mailErr) {
                                console.error('Error enviando correo de pago aprobado:', mailErr);
                            }
                        }
                        break;

                    case 'pending':
                    case 'in_process':
                        // CASO: CONT (Pendiente de pago)
                        await Appointment.findByIdAndUpdate(
                            appointmentId,
                            { status: 'Payment_Pending' }
                        );
                        console.log(`Pago PENDIENTE para la cita ${appointmentId}.`);
                        break;

                    case 'rejected':
                        // CASOS: OTHE, FUND, SECU, CALL, etc. (Rechazado)
                        const citaRechazada = await Appointment.findByIdAndUpdate(
                            appointmentId,
                            { status: 'Payment_Failed' },
                            { new: true }
                        );
                        console.log(`Pago RECHAZADO para la cita ${appointmentId}.`);

                        // Enviar correo de pago rechazado al paciente
                        if (citaRechazada) {
                            try {
                                const usuario = await User.findById(citaRechazada.user);
                                if (usuario) {
                                    const concepto = paymentInfo.description || citaRechazada.reason || 'Cita dental';
                                    await enviarCorreoSMTP({
                                        to: usuario.email,
                                        subject: 'Pago no procesado - Dental One',
                                        html: emailTemplates.pagoRechazado(usuario.nombre, concepto)
                                    });
                                    console.log(`Correo de pago rechazado enviado a ${usuario.email}`);
                                }
                            } catch (mailErr) {
                                console.error('Error enviando correo de pago rechazado:', mailErr);
                            }
                        }
                        break;
                }
            }
        }

        // Siempre responder 200 OK para que MP deje de mandar el mismo aviso
        res.status(200).send("OK");

    } catch (error) {
        console.error("Error en el Webhook:", error);
        // Responder 200 incluso en error para evitar reintentos infinitos de MP
        res.status(200).send("OK");
    }
}

module.exports = { val, proccesPay, receiveWebhook }