const crypto = require('crypto');
const modelMP = require('../models/mercado_pago');
const Appointment = require('../models/scheduling');
const User = require('../models/users');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { findTreatment, amountForMode } = require('../config/treatments');
const {
    RESERVATION_MINUTES, INACTIVE_STATUSES, findScheduleConflict, pendingPaymentDeadline, appendNote
} = require('../services/reservations');

// Importamos el mailer y los templates
const { enviarCorreoSMTP } = require('../services/mailer');
const emailTemplates = require('../services/emailTemplates');

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentClient = new Payment(client);

const val = (req, res) => {
    res.send('Hola desde vista MP');
};

/**
 * Valida la firma criptográfica x-signature enviada por Mercado Pago (CDONE-58)
 */
const verifyWebhookSignature = (req) => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return true; // Si no está configurada la variable, continúa con verificación por SDK

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (!xSignature || !xRequestId) return false;

    const parts = xSignature.split(',');
    let ts = '';
    let v1 = '';
    parts.forEach(part => {
        const [k, v] = part.split('=');
        if (k && k.trim() === 'ts') ts = v.trim();
        if (k && k.trim() === 'v1') v1 = v.trim();
    });

    if (!ts || !v1) return false;
    const dataId = req.query['data.id'] || req.body?.data?.id || '';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return expected === v1;
};

/**
 * Crea la preferencia de pago de una cita (CDONE-58, CDONE-66).
 * Body: { appointmentId, paymentMode: 'full' | 'partial' }.
 * El monto se calcula aquí a partir del tratamiento de la cita; se ignoran
 * price, title e idUser que pudiera mandar el cliente.
 */
const proccesPay = async (req, res) => {
    try {
        const { appointmentId } = req.body || {};
        const paymentMode = req.body?.paymentMode === 'partial' ? 'partial' : 'full';
        const userId = req.user.id; // Disponible gracias al authMiddleware

        if (!appointmentId) {
            return res.status(400).json({ msg: 'Falta el ID de la cita a pagar.' });
        }

        // Validar que la cita exista y pertenezca al usuario
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ msg: 'La cita no fue encontrada.' });
        }

        if (String(appointment.user) !== String(userId)) {
            return res.status(403).json({ msg: 'No tienes permiso para pagar esta cita.' });
        }

        // Solo se pagan en línea las citas recién apartadas o con pago pendiente
        if (!['Scheduled', 'Payment_Pending'].includes(appointment.status)) {
            return res.status(400).json({ msg: 'Esta cita ya fue pagada, cancelada o se paga en clínica.' });
        }

        // El precio sale del catálogo del servidor, nunca del cliente
        const treatment = findTreatment(appointment.reason);
        if (!treatment) {
            return res.status(400).json({ msg: 'El tratamiento de la cita no tiene un precio configurado.' });
        }
        const total = treatment.price;
        const amount = amountForMode(total, paymentMode);
        const title = paymentMode === 'partial'
            ? `Anticipo (50%) - ${treatment.reason}`
            : treatment.reason;

        // Si la reserva ya venció (aunque el worker aún no la cancele) no se cobra
        if (appointment.expiresAt && new Date(appointment.expiresAt) <= new Date()) {
            return res.status(400).json({ msg: 'El tiempo para pagar esta reserva terminó. Agenda tu cita de nuevo.' });
        }

        // CDONE-60: Si la cita estaba en Scheduled, transiciona a Payment_Pending y renueva timeout
        appointment.status = 'Payment_Pending';
        if (!appointment.expiresAt) {
            appointment.expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
        }
        appointment.price = total;
        appointment.paymentMode = paymentMode;
        appointment.amountExpected = amount;
        appointment.notes = appendNote(
            appointment.notes,
            paymentMode === 'partial'
                ? `Anticipo en línea: $${amount} MXN (saldo a pagar en clínica: $${total - amount} MXN)`
                : `Pago total en línea: $${amount} MXN`
        );
        await appointment.save();

        // Crear la preferencia en Mercado Pago (CDONE-58)
        const preferences = await modelMP.crearPreferencia({
            title,
            amount,
            appointmentId: String(appointment._id),
            userId: String(userId),
            // CDONE-60: el checkout se cierra al vencer la reserva y las fichas OXXO/SPEI
            // vencen antes de la cita
            expiresAt: appointment.expiresAt,
            offlineDeadline: pendingPaymentDeadline(appointment)
        });

        res.json({ ...preferences, amount, total, paymentMode });
    } catch (error) {
        console.error("Error al crear preferencia MP:", error);
        res.status(500).send("Error al crear preferencia");
    }
};

const receiveWebhook = async (req, res) => {
    try {
        // CDONE-58: Verificación de firma criptográfica
        if (!verifyWebhookSignature(req)) {
            console.warn('[Webhook MP] Advertencia: Firma inválida en encabezado x-signature.');
            return res.status(401).send("Firma inválida");
        }

        const paymentId = req.query['data.id'] || req.body?.data?.id;
        const type = req.query.type || req.body?.type;

        if (type === 'payment' && paymentId) {
            // Consultamos el estado real del pago mediante SDK de Mercado Pago
            const paymentInfo = await paymentClient.get({ id: paymentId });
            const appointmentId = paymentInfo.metadata?.appointment_id;

            if (appointmentId) {
                const citaActual = await Appointment.findById(appointmentId);

                if (!citaActual) {
                    console.warn(`[Webhook MP] Cita ${appointmentId} no encontrada en base de datos.`);
                    return res.status(200).send("OK");
                }

                // CDONE-58: Control de Idempotencia para evitar cobros o correos duplicados
                if (citaActual.status === 'Confirmed' && paymentInfo.status === 'approved') {
                    console.log(`[Webhook MP] Cita ${appointmentId} ya confirmada previamente. Descartando duplicado.`);
                    return res.status(200).send("OK");
                }

                // Una cita ya pagada o atendida no se degrada por avisos atrasados o reintentos fallidos
                if (['Confirmed', 'Completed'].includes(citaActual.status)) {
                    console.log(`[Webhook MP] Cita ${appointmentId} ya está ${citaActual.status}; se ignora el aviso '${paymentInfo.status}' del pago ${paymentId}.`);
                    return res.status(200).send("OK");
                }

                // CDONE-60: la reserva ya se había liberado (venció o un intento anterior se rechazó)
                // y otro paciente pudo tomar el horario. No se confirma encima sin revisar.
                let notaReactivada = '';
                if (INACTIVE_STATUSES.includes(citaActual.status) && ['approved', 'pending', 'in_process'].includes(paymentInfo.status)) {
                    const conflicto = await findScheduleConflict(citaActual, appointmentId);
                    if (conflicto) {
                        console.warn(`[Webhook MP] Pago ${paymentId} (${paymentInfo.status}) llegó para la cita ${appointmentId} en estado ${citaActual.status} y el horario ya está ocupado. Requiere revisión manual (reagendar o reembolsar).`);
                        await Appointment.findByIdAndUpdate(appointmentId, {
                            notes: appendNote(
                                citaActual.notes,
                                `Pago ${paymentId} (${paymentInfo.status}, $${paymentInfo.transaction_amount} MXN) llegó después de liberar la reserva y el horario ya está ocupado: reagendar o reembolsar`
                            )
                        });
                        return res.status(200).send("OK");
                    }
                    notaReactivada = `Reserva reactivada por el pago ${paymentId} (${paymentInfo.status}) recibido después de liberarla`;
                    console.warn(`[Webhook MP] Cita ${appointmentId} estaba ${citaActual.status}; el horario sigue libre y se reactiva por el pago ${paymentId}.`);
                }
                const conNota = notaReactivada ? { notes: appendNote(citaActual.notes, notaReactivada) } : {};

                // Evaluamos el ESTADO del pago que nos devuelve Mercado Pago
                switch (paymentInfo.status) {
                    case 'approved': {
                        // El monto cobrado debe coincidir con el calculado en proccesPay
                        const esperado = Number(citaActual.amountExpected);
                        const cobrado = Number(paymentInfo.transaction_amount);
                        if (!esperado || !(Math.abs(cobrado - esperado) < 0.01)) {
                            console.warn(`[Webhook MP] Pago ${paymentId} de $${cobrado} no coincide con el esperado ($${esperado || 'desconocido'}) para la cita ${appointmentId}. No se confirma.`);
                            await Appointment.findByIdAndUpdate(appointmentId, {
                                notes: appendNote(
                                    citaActual.notes,
                                    `Pago ${paymentId} aprobado por $${cobrado} MXN pero se esperaban $${esperado || '?'} MXN: revisar manualmente`
                                )
                            });
                            break;
                        }

                        // CASO: APRO (Pago aprobado) - Liberamos timeout y confirmamos cita
                        const citaPagada = await Appointment.findByIdAndUpdate(
                            appointmentId,
                            { 
                                status: 'Confirmed',
                                ...conNota,
                                $unset: { expiresAt: 1 } // CDONE-60: Remueve timeout al confirmar
                            },
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
                                    // Sin await: MP espera un 200 rápido
                                    enviarCorreoSMTP({
                                        to: usuario.email,
                                        subject: 'Comprobante de pago - Dental One',
                                        html: emailTemplates.pagoRecibido(usuario.nombre, monto, concepto)
                                    });
                                }
                            } catch (mailErr) {
                                console.error('Error enviando correo de pago aprobado:', mailErr);
                            }
                        }
                        break;
                    }

                    case 'pending':
                    case 'in_process': {
                        // CASO: CONT (Pendiente de pago). OXXO, SPEI o pagos en revisión pueden tardar
                        // horas: se extiende la reserva hasta el vencimiento del pago (sin pasar de la cita)
                        // para que el worker no la cancele mientras tanto.
                        const nuevoVencimiento = pendingPaymentDeadline(citaActual, paymentInfo.date_of_expiration);
                        await Appointment.findByIdAndUpdate(
                            appointmentId,
                            { status: 'Payment_Pending', expiresAt: nuevoVencimiento, ...conNota }
                        );
                        console.log(`Pago PENDIENTE para la cita ${appointmentId}. Reserva apartada hasta ${nuevoVencimiento.toISOString()}.`);
                        break;
                    }

                    case 'rejected':
                        // CASOS: OTHE, FUND, SECU, CALL, etc. (Rechazado)
                        const citaRechazada = await Appointment.findByIdAndUpdate(
                            appointmentId,
                            { 
                                status: 'Payment_Failed',
                                $unset: { expiresAt: 1 }
                            },
                            { new: true }
                        );
                        console.log(`Pago RECHAZADO para la cita ${appointmentId}.`);

                        // Enviar correo de pago rechazado al paciente
                        if (citaRechazada) {
                            try {
                                const usuario = await User.findById(citaRechazada.user);
                                if (usuario) {
                                    const concepto = paymentInfo.description || citaRechazada.reason || 'Cita dental';
                                    // Sin await: MP espera un 200 rápido
                                    enviarCorreoSMTP({
                                        to: usuario.email,
                                        subject: 'Pago no procesado - Dental One',
                                        html: emailTemplates.pagoRechazado(usuario.nombre, concepto)
                                    });
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
};

module.exports = { val, proccesPay, receiveWebhook };
