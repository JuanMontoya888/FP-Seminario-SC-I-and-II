require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/scheduling');

async function check() {
    try {
        const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dental-one';
        await mongoose.connect(dbURI);

        const apps = await Appointment.find().sort({ createdAt: -1 }).limit(10);
        
        console.log("=== ÚLTIMAS 10 CITAS EN LA BD ===");
        apps.forEach(a => {
            console.log(`ID: ${a._id} | Paciente: ${a.patientName} | Fecha: ${a.dateTime} | Estado: ${a.status} | Creada: ${a.createdAt}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
