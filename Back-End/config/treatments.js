// ==========================================
// Catálogo de tratamientos (fuente única de verdad)
// ==========================================
// El precio y la duración de cada cita se toman SIEMPRE de aquí, nunca del
// cliente. El front-end lo consulta en GET /api/treatments para pintar el
// formulario de agendamiento.

const TREATMENTS = [
    {
        reason: 'Cita de valoración',
        duration: 30,
        assignDoctor: 'Dra. Elena Sonrisa',
        price: 950,
        description: 'Incluye: valoración del estado de salud bucal general, toma de imágenes en zonas problema y toma radiográfica de ser necesario.'
    },
    { reason: 'Restauraciones', duration: 60, assignDoctor: 'Dr. Roberto Molar', price: 950 },
    { reason: 'Limpieza Dental y Revisión General', duration: 45, assignDoctor: 'Dra. Elena Sonrisa', price: 600 },
    { reason: 'Resina (Empaste por caries)', duration: 60, assignDoctor: 'Dr. Roberto Molar', price: 850 },
    { reason: 'Ajuste de Brackets (Ortodoncia)', duration: 20, assignDoctor: 'Dra. Sofía Frenillos', price: 500 },
    { reason: 'Extracción Simple / Muela', duration: 45, assignDoctor: 'Dr. Roberto Molar', price: 1200 },
    { reason: 'Blanqueamiento Dental', duration: 60, assignDoctor: 'Dra. Elena Sonrisa', price: 2500 },
    { reason: 'Endodoncia (Tratamiento de conducto)', duration: 90, assignDoctor: 'Dr. Carlos Raíz', price: 3800 },
    { reason: 'Valoración para Implante', duration: 30, assignDoctor: 'Dr. Javier Cirujano', price: 300 },
    { reason: 'Urgencia Dental (Dolor agudo)', duration: 30, assignDoctor: 'Dra. Elena Sonrisa', price: 500 }
];

// Porcentaje que se cobra en línea con la modalidad de anticipo (CDONE-66)
const PARTIAL_PAYMENT_RATE = 0.5;

const findTreatment = (reason) => TREATMENTS.find(t => t.reason === reason) || null;

/**
 * Monto a cobrar en línea según la modalidad de pago.
 * @param {number} price precio total del tratamiento
 * @param {'full'|'partial'} mode
 */
const amountForMode = (price, mode) => (
    mode === 'partial' ? Math.round(price * PARTIAL_PAYMENT_RATE) : price
);

module.exports = {
    TREATMENTS,
    PARTIAL_PAYMENT_RATE,
    findTreatment,
    amountForMode
};
