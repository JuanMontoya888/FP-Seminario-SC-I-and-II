const mongoose = require('mongoose');
const User = require('./models/users');

mongoose.connect('mongodb://mongodb:27017/Dental-One')
  .then(async () => {
    console.log('Connected to MongoDB para crear admin');
    
    // Eliminar si existe para recrear
    await User.deleteMany({ email: 'montoya.martinez.juan.cb284@gmail.com' });
    
    // Crear Admin
    await User.create({
      nombre: 'Juan',
      apellidos: 'Montoya',
      email: 'montoya.martinez.juan.cb284@gmail.com',
      password: 'admin',
      role: 'admin',
      isVerified: true
    });
    
    console.log('Admin creado correctamente!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
