const User = require('../models/users');
const PatientDetails = require('../models/patientDetails');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { enviarCorreoSMTP } = require('../services/mailer');
const emailTemplates = require('../services/emailTemplates');

// (Opcional) Si usas google-auth-library para el inicio de sesión con Google:
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('305375866482-j66uhnuh0t4hjk67bb7dd2js5glqn6hg.apps.googleusercontent.com');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('Falta la variable de entorno JWT_SECRET. Configúrala en tu archivo .env o en el panel de tu hosting.');
}

const register = async (req, res) => {
    try {
        const { nombre, apellidos, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ msg: 'El email ya está registrado.' });
        }

        // Generar token de verificación
        const verificationToken = crypto.randomBytes(32).toString('hex');

        user = new User({ 
            nombre, 
            apellidos, 
            email, 
            password,
            isVerified: false,
            verificationToken 
        });
        await user.save();

        // Enviar correo de verificación
        const verificationUrl = `http://localhost:3000/api/verify-email/${verificationToken}`;

        await enviarCorreoSMTP({
            to: email,
            subject: 'Verifica tu correo electrónico - Dental One',
            html: emailTemplates.verificacionCorreo(nombre, verificationUrl)
        });

        res.status(201).json({
            msg: 'Registro exitoso. Por favor revisa tu correo electrónico para verificar tu cuenta.',
            userId: user._id
        });

    } catch (err) {
        console.error('Error al registrar usuario:', err.message);
        res.status(500).json({ msg: 'Error interno del servidor al registrar.' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        // 1. Primero verificamos si el usuario existe
        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas (Usuario no encontrado)' });
        }

        // 2. Verificamos la contraseña
        const isPassword = await bcrypt.compare(password, user.password);
        if (!isPassword) {
            return res.status(400).json({ msg: 'Credenciales inválidas (Contraseña incorrecta)' });
        }

        // 3. Verificar si el correo ha sido confirmado
        if (!user.isVerified) {
            return res.status(401).json({ msg: 'Por favor verifica tu correo electrónico antes de iniciar sesión.' });
        }

        // 4. Buscamos los detalles adicionales
        const pDetails = await PatientDetails.findOne({ user: user._id });

        // 4. Construimos el Payload
        const payload = {
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;

                // 5. Respondemos al Frontend
                res.json({
                    msg: 'Inicio de sesion exitoso',
                    token: token,
                    userId: user._id,
                    nombre: user.nombre,
                    numcel: pDetails?.numcel || null,
                    email: user.email,
                    role: user.role,
                    patientType: user.patientType,
                    canPayAtClinic: user.canPayAtClinic
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        res.status(200).json(user);

    } catch (err) {
        console.error('Error al obtener el perfil:', err.message);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

// Guarda el tipo de paciente elegido tras el registro (nuevo / ya ha ido).
// 'returning' puede pagar en clínica desde el inicio; 'new' debe pagar
// su primera cita en línea (canPayAtClinic se activa al aprobarse ese pago).
const setPatientType = async (req, res) => {
    try {
        const { patientType } = req.body;
        if (!['new', 'returning'].includes(patientType)) {
            return res.status(400).json({ msg: 'Tipo de paciente inválido.' });
        }

        const canPayAtClinic = patientType === 'returning';

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { patientType, canPayAtClinic },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        res.status(200).json({
            msg: 'Tipo de paciente guardado.',
            patientType: user.patientType,
            canPayAtClinic: user.canPayAtClinic
        });
    } catch (err) {
        console.error('Error al guardar tipo de paciente:', err);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

const googleLogin = async (req, res) => {
    console.log('Token recibido. Se intentará redirigir:', req.body.token);
    try {
        const ticket = await client.verifyIdToken({
            idToken: req.body.token,
            audience: '305375866482-j66uhnuh0t4hjk67bb7dd2js5glqn6hg.apps.googleusercontent.com'
        });

        // extraemos los datos seguros
        const payloadG = ticket.getPayload();
        const email = payloadG.email;

        const user = await User.findOne({ email }).select('-password');
        if (user) {
            const payload = {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role
                }
            };
            jwt.sign(
                payload,
                jwtSecret,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({
                        msg: 'Inicio de sesion exitoso',
                        token: token,
                        user: user
                    });
                }
            );
        } else {
            return res.status(404).json({
                msg: 'El usuario no está registrado',
                needRegister: true, 
                prefillData: {      
                    email: email,
                    name: payloadG.name,
                    picture: payloadG.picture
                }
            });
        }
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: "Token inválido" });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).send(`
                <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                    <h2 style="color: red;">Token inválido o expirado.</h2>
                    <p>Es posible que ya hayas verificado tu correo o el enlace sea incorrecto.</p>
                </div>
            `);
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        // Enviar correo de bienvenida (no bloquea la verificación si falla)
        try {
            await enviarCorreoSMTP({
                to: user.email,
                subject: '¡Bienvenido a Dental One!',
                html: emailTemplates.bienvenida(user.nombre)
            });
        } catch (mailErr) {
            console.error('Error enviando correo de bienvenida:', mailErr);
        }

        res.status(200).send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h1 style="color: green;">¡Correo verificado con éxito!</h1>
                <p>Ya puedes cerrar esta ventana e iniciar sesión en tu cuenta de Dental One.</p>
                <br>
                <a href="http://localhost:4200/log-in" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir a Iniciar Sesión</a>
            </div>
        `);
    } catch (error) {
        console.error('Error verificando el email:', error);
        res.status(500).send('<h2>Error interno del servidor.</h2>');
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ msg: 'El correo electrónico ya ha sido verificado.' });
        }

        // Generar un nuevo token de verificación
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        // Enviar el correo de verificación con template unificado
        const verificationUrl = `http://localhost:3000/api/verify-email/${verificationToken}`;

        await enviarCorreoSMTP({
            to: email,
            subject: 'Reenvío de Verificación de correo electrónico - Dental One',
            html: emailTemplates.verificacionCorreo(user.nombre, verificationUrl)
        });

        res.status(200).json({ msg: 'Correo de verificación reenviado exitosamente.' });

    } catch (err) {
        console.error('Error al reenviar correo:', err.message);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Retornamos 200 aunque no exista para no revelar qué correos están registrados (seguridad)
            return res.status(200).json({ msg: 'Si el correo existe, se ha enviado un enlace de recuperación.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        const resetUrl = `http://localhost:4200/reset-password/${resetToken}`;

        await enviarCorreoSMTP({
            to: email,
            subject: 'Restablecer contraseña - Dental One',
            html: emailTemplates.recuperarContrasena(user.nombre, resetUrl)
        });

        res.status(200).json({ msg: 'Si el correo existe, se ha enviado un enlace de recuperación.' });

    } catch (err) {
        console.error('Error en forgotPassword:', err.message);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Verifica que no haya expirado
        });

        if (!user) {
            return res.status(400).json({ msg: 'El token de recuperación es inválido o ha expirado.' });
        }

        user.password = password; // El pre-save hook se encarga del hash
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({ msg: 'Tu contraseña ha sido actualizada con éxito.' });

    } catch (err) {
        console.error('Error en resetPassword:', err.message);
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    googleLogin,
    setPatientType,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword
};