const styles = {
    container: "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;",
    header: "padding: 40px 0; text-align: center; border-bottom: 1px solid #eee;",
    body: "padding: 40px 20px;",
    footer: "padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;",
    button: "display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 2px; font-weight: bold; margin-top: 20px;",
    table: "width: 100%; border-collapse: collapse; margin: 25px 0;",
    tdLabel: "padding: 10px 0; color: #888; font-size: 14px; text-transform: uppercase; width: 35%;",
    tdContent: "padding: 10px 0; color: #000; font-size: 15px; font-weight: 500;"
};

const templates = {
    // 1. BIENVENIDA
    bienvenida: (nombre) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Bienvenido, ${nombre}</h2>
                <p>Gracias por confiar en Dental One. Tu cuenta ha sido creada exitosamente y ahora puedes gestionar tus citas y revisar tu historial clínico desde nuestro portal.</p>
                <a href="https://dentalone.mx/login" style="${styles.button}">ACCEDER A MI CUENTA</a>
            </div>
            <div style="${styles.footer}">
                <p>Este es un mensaje automático. No es necesario responder.</p>
            </div>
        </div>
    `,

    // 2. CONFIRMACIÓN DE CITA (Minimalista)
    citaConfirmada: (datos) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Confirmación de Cita</h2>
                <p>Se ha programado una nueva cita con los siguientes detalles:</p>
                <table style="${styles.table}">
                    <tr><td style="${styles.tdLabel}">Paciente</td><td style="${styles.tdContent}">${datos.patientName}</td></tr>
                    <tr><td style="${styles.tdLabel}">Fecha</td><td style="${styles.tdContent}">${datos.dateOnlyString}</td></tr>
                    <tr><td style="${styles.tdLabel}">Hora</td><td style="${styles.tdContent}">${datos.hour} hrs</td></tr>
                    <tr><td style="${styles.tdLabel}">Especialista</td><td style="${styles.tdContent}">${datos.providerName}</td></tr>
                    <tr><td style="${styles.tdLabel}">Motivo</td><td style="${styles.tdContent}">${datos.reason}</td></tr>
                </table>
                <p style="font-size: 13px; color: #666;">En caso de requerir un cambio en su horario, le solicitamos notificarnos con 24 horas de antelación.</p>
            </div>
            <div style="${styles.footer}">
                <p>Dental One | Clínica Odontológica</p>
            </div>
        </div>
    `,

    // 3. CONFIRMACIÓN DE PAGO
    pagoRecibido: (nombre, monto, concepto) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Comprobante de Pago</h2>
                <p>Hola ${nombre}, hemos recibido correctamente tu pago. Los detalles se muestran a continuación:</p>
                <table style="${styles.table}">
                    <tr><td style="${styles.tdLabel}">Concepto</td><td style="${styles.tdContent}">${concepto}</td></tr>
                    <tr><td style="${styles.tdLabel}">Monto</td><td style="${styles.tdContent}">$${monto} MXN</td></tr>
                    <tr><td style="${styles.tdLabel}">Estado</td><td style="${styles.tdContent}">Aprobado</td></tr>
                </table>
            </div>
            <div style="${styles.footer}">
                <p>© 2026 Dental One. Todos los derechos reservados.</p>
            </div>
        </div>
    `,

    // 4. VERIFICACIÓN DE CORREO ELECTRÓNICO
    verificacionCorreo: (nombre, verificationUrl) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Verifica tu correo electrónico</h2>
                <p>Hola ${nombre}, gracias por registrarte en Dental One. Para activar tu cuenta, haz clic en el siguiente botón:</p>
                <a href="${verificationUrl}" style="${styles.button}">VERIFICAR CORREO</a>
                <p style="font-size: 13px; color: #666; margin-top: 25px;">O copia y pega esta URL en tu navegador:<br><a href="${verificationUrl}" style="color: #333;">${verificationUrl}</a></p>
            </div>
            <div style="${styles.footer}">
                <p>Si no creaste una cuenta en Dental One, puedes ignorar este mensaje.</p>
            </div>
        </div>
    `,

    // 5. RECUPERACIÓN DE CONTRASEÑA
    recuperarContrasena: (nombre, resetUrl) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Restablecer contraseña</h2>
                <p>Hola ${nombre}, hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                <a href="${resetUrl}" style="${styles.button}">RESTABLECER CONTRASEÑA</a>
                <p style="font-size: 13px; color: #666; margin-top: 25px;">Si no solicitaste este cambio, puedes ignorar este correo. El enlace expirará en 1 hora.</p>
            </div>
            <div style="${styles.footer}">
                <p>Este es un mensaje automático. No es necesario responder.</p>
            </div>
        </div>
    `,

    // 6. PAGO RECHAZADO
    pagoRechazado: (nombre, concepto) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Pago no procesado</h2>
                <p>Hola ${nombre}, lamentamos informarte que tu pago no pudo ser procesado.</p>
                <table style="${styles.table}">
                    <tr><td style="${styles.tdLabel}">Concepto</td><td style="${styles.tdContent}">${concepto}</td></tr>
                    <tr><td style="${styles.tdLabel}">Estado</td><td style="${styles.tdContent}">Rechazado</td></tr>
                </table>
                <p style="font-size: 13px; color: #666;">Te recomendamos verificar los datos de tu método de pago e intentar nuevamente. Si el problema persiste, contacta a tu banco.</p>
            </div>
            <div style="${styles.footer}">
                <p>Dental One | Clínica Odontológica</p>
            </div>
        </div>
    `,

    // 7. CANCELACIÓN DE CITA
    citaCancelada: (datos) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Cita cancelada</h2>
                <p>Te informamos que la siguiente cita ha sido cancelada:</p>
                <table style="${styles.table}">
                    <tr><td style="${styles.tdLabel}">Paciente</td><td style="${styles.tdContent}">${datos.patientName}</td></tr>
                    <tr><td style="${styles.tdLabel}">Fecha</td><td style="${styles.tdContent}">${datos.dateOnlyString}</td></tr>
                    <tr><td style="${styles.tdLabel}">Hora</td><td style="${styles.tdContent}">${datos.hour} hrs</td></tr>
                    <tr><td style="${styles.tdLabel}">Motivo de cita</td><td style="${styles.tdContent}">${datos.reason}</td></tr>
                </table>
                <p style="font-size: 13px; color: #666;">Si deseas reagendar, puedes hacerlo desde nuestro portal.</p>
            </div>
            <div style="${styles.footer}">
                <p>Dental One | Clínica Odontológica</p>
            </div>
        </div>
    `,

    // 8. CONTACTO (AL ADMIN DE LA CLÍNICA)
    contactoAdmin: (datos) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Nuevo mensaje de contacto</h2>
                <p>Has recibido un nuevo mensaje a través del formulario de la página web.</p>
                <table style="${styles.table}">
                    <tr><td style="${styles.tdLabel}">Paciente</td><td style="${styles.tdContent}">${datos.nombre}</td></tr>
                    <tr><td style="${styles.tdLabel}">Email</td><td style="${styles.tdContent}">${datos.email}</td></tr>
                    <tr><td style="${styles.tdLabel}">Celular</td><td style="${styles.tdContent}">${datos.celular}</td></tr>
                    <tr><td style="${styles.tdLabel}">Asunto</td><td style="${styles.tdContent}">${datos.asunto}</td></tr>
                </table>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
                    <p style="margin: 0; font-style: italic;">"${datos.mensaje}"</p>
                </div>
            </div>
            <div style="${styles.footer}">
                <p>Notificación automática del sistema de Dental One</p>
            </div>
        </div>
    `,

    // 9. CONTACTO (ACUSE AL PACIENTE)
    contactoPaciente: (nombre) => `
        <div style="${styles.container}">
            <div style="${styles.header}">
                <h1 style="margin: 0; font-weight: 300; letter-spacing: 2px;">DENTAL ONE</h1>
            </div>
            <div style="${styles.body}">
                <h2 style="font-weight: 400;">Hemos recibido tu mensaje</h2>
                <p>Hola ${nombre}, gracias por contactarte con nosotros.</p>
                <p>Este es un correo automático para confirmarte que hemos recibido exitosamente tu mensaje a través de nuestro portal.</p>
                <p>Nuestro equipo de atención al paciente revisará tu consulta y se pondrá en contacto contigo a la brevedad posible.</p>
            </div>
            <div style="${styles.footer}">
                <p>Dental One | Clínica Odontológica</p>
            </div>
        </div>
    `
};

module.exports = templates;