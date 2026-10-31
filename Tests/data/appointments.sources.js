/**
 * Sources / Data Providers globales para las pruebas de Appointments.
 * Ubicado en Tests/data/ bajo la arquitectura plana y desacoplada.
 */
const unauthorizedTokenCases = [
  { description: 'sin header Authorization ni x-auth-token', headers: {}, expectedStatus: 401, expectedMsg: 'No autorizado, no hay token.' },
  { description: 'con header Authorization vacío', headers: { Authorization: 'Bearer ' }, expectedStatus: 401, expectedMsg: 'No autorizado, no hay token.' },
  { description: 'con token JWT malformado o inválido', headers: { Authorization: 'Bearer token_invalido_123' }, expectedStatus: 401, expectedMsg: 'Token no válido.' }
];

const invalidRangeCases = [
  {
    description: 'falta la fecha',
    payload: { startHour: '09:00', endHour: '11:00' },
    expectedStatus: 400,
    expectedMsg: 'Se requieren fecha, hora inicial y hora final.'
  },
  {
    description: 'hora final menor que la hora inicial',
    payload: { date: '2026-10-30', startHour: '12:00', endHour: '10:00' },
    expectedStatus: 400,
    expectedMsg: 'La hora final debe ser mayor que la inicial.'
  },
  {
    description: 'hora final igual a la hora inicial',
    payload: { date: '2026-10-30', startHour: '10:00', endHour: '10:00' },
    expectedStatus: 400,
    expectedMsg: 'La hora final debe ser mayor que la inicial.'
  }
];

const nonCancellableStatuses = [
  { status: 'Confirmed' },
  { status: 'Completed' }
];

module.exports = {
  unauthorizedTokenCases,
  invalidRangeCases,
  nonCancellableStatuses
};
