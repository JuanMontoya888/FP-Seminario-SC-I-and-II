const mongoose = require('mongoose');
const User = require('./models/users');

mongoose.connect('mongodb://mongodb:27017/Dental-One')
  .then(async () => {
    console.log('Connected to MongoDB para seed');
    
    // Eliminar previos si existen
    await User.deleteMany({ email: { $in: ['admin@dentalone.com', 'usuario@dentalone.com'] } });
    
    // Crear Admin
    await User.create({
      nombre: 'Admin',
      apellidos: 'DentalOne',
      email: 'admin@dentalone.com',
      password: 'admin',
      role: 'admin',
      isVerified: true
    });
    
    // Crear Usuario normal
    await User.create({
      nombre: 'Juan',
      apellidos: 'Paciente',
      email: 'usuario@dentalone.com',
      password: 'user123',
      role: 'user',
      isVerified: true
    });
    
    console.log('Usuarios creados correctamente!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
