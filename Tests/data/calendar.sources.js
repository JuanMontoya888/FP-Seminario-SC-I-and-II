/**
 * Sources / Data Providers globales para las pruebas de Calendar.
 * Ubicado en Tests/data/ bajo la arquitectura plana y desacoplada.
 */
const calendarStatusCases = [
  { status: 'Confirmed', expectedColor: 'green', expectedLabel: 'Pagada', isCancellable: false },
  { status: 'Scheduled', expectedColor: 'yellow', expectedLabel: 'Agendada', isCancellable: true },
  { status: 'Completed', expectedColor: 'blue', expectedLabel: 'Completada', isCancellable: false },
  { status: 'Canceled', expectedColor: 'red', expectedLabel: 'Cancelada', isCancellable: false },
  { status: 'Payment_Failed', expectedColor: 'red', expectedLabel: 'Pago fallido', isCancellable: true },
  { status: 'Payment_Pending', expectedColor: 'yellow', expectedLabel: 'Pago pendiente', isCancellable: true },
  { status: 'Pending_Clinic_Payment', expectedColor: 'yellow', expectedLabel: 'Pago en clínica', isCancellable: true },
  { status: 'Unknown_Status', expectedColor: 'gray', expectedLabel: 'Unknown_Status', isCancellable: true }
];

const calendarMonthCases = [
  { monthTitle: 'Octubre', pageTitle: 'DentalOne - Calendario Octubre' },
  { monthTitle: 'Noviembre', pageTitle: 'DentalOne - Calendario Noviembre' },
  { monthTitle: 'Diciembre', pageTitle: 'DentalOne - Calendario Diciembre' }
];

const invalidBaseUrlCases = [
  { invalidUrl: '' },
  { invalidUrl: null },
  { invalidUrl: undefined }
];

module.exports = {
  calendarStatusCases,
  calendarMonthCases,
  invalidBaseUrlCases
};
