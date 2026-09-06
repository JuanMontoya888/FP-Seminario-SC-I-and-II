const User = require('../models/users');

// Verifica que el usuario autenticado sea administrador.
// Consulta el rol DIRECTAMENTE en la base de datos para que funcione
// sin importar cómo se generó el token (login normal, Google, etc.)
// y refresca req.user.role con el valor real.
//
// Debe usarse SIEMPRE después de authMiddleware.
const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: 'No autorizado.' });
        }

        const user = await User.findById(req.user.id).select('role');
        if (!user) {
            return res.status(401).json({ msg: 'Usuario no encontrado.' });
        }

        // Refrescamos el rol con el valor real de la BD
        req.user.role = user.role;

        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado. Se requieren permisos de administrador.' });
        }

        next();
    } catch (err) {
        console.error('Error en adminMiddleware:', err);
        res.status(500).json({ msg: 'Error verificando permisos.' });
    }
};

module.exports = adminMiddleware;
