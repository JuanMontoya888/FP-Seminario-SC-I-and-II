const jwt = require('jsonwebtoken');

// El secreto se toma de las variables de entorno (.env)
const jwtSecret = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    if (!jwtSecret) {
        console.error('Falta la variable de entorno JWT_SECRET.');
        return res.status(500).json({ msg: 'Error de configuración del servidor.' });
    }

    // Aceptamos el token desde 'Authorization: Bearer <token>' o desde 'x-auth-token'
    const authHeader = req.header('Authorization');
    const token = authHeader
        ? authHeader.replace('Bearer ', '')
        : req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No autorizado, no hay token.' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token no válido.' });
    }
};

module.exports = authMiddleware;
