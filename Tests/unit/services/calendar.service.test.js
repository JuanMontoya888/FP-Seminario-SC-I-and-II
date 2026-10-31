const { calendarStatusCases } = require('../../data/calendar.sources');

/**
 * Funciones puras de lógica de negocio del servicio/componente Calendar
 * (alineadas con Front-End/src/app/components/calendar/calendar.ts).
 */
const CalendarDomainLogic = {
  getStatusColor(status) {
    switch (status) {
      case 'Confirmed': return 'green';
      case 'Scheduled': return 'yellow';
      case 'Completed': return 'blue';
      case 'Canceled': return 'red';
      case 'Payment_Failed': return 'red';
      case 'Payment_Pending': return 'yellow';
      case 'Pending_Clinic_Payment': return 'yellow';
      default: return 'gray';
    }
  },

  statusLabel(status) {
    switch (status) {
      case 'Scheduled': return 'Agendada';
      case 'Confirmed': return 'Pagada';
      case 'Completed': return 'Completada';
      case 'Canceled': return 'Cancelada';
      case 'Payment_Pending': return 'Pago pendiente';
      case 'Payment_Failed': return 'Pago fallido';
      case 'Pending_Clinic_Payment': return 'Pago en clínica';
      default: return status;
    }
  },

  isCancellable(status) {
    return !['Confirmed', 'Completed', 'Canceled'].includes(status);
  },

  generateHoursArray(startHour, finishHour) {
    if (finishHour < startHour) {
      throw new Error('La hora final no puede ser menor que la hora inicial.');
    }
    const hours = [];
    for (let i = startHour; i <= finishHour; i += 0.5) {
      const intHours = Math.floor(i);
      const decimalPart = i - intHours;
      const mConverted = decimalPart * 60;
      const h = intHours < 10 ? `0${intHours}` : `${intHours}`;
      const m = mConverted < 10 ? `0${mConverted.toFixed(0)}` : mConverted.toFixed(0);
      hours.push(`${h}:${m}`);
    }
    return hours;
  }
};

/**
 * Suite de pruebas unitarias para la lógica de negocio (Services) de Calendar.
 * Ubicada en Tests/unit/services/ bajo la arquitectura plana y desacoplada.
 */
describe('Unit Services - Calendar Business Logic Tests', () => {
  test.each(calendarStatusCases)(
    'DadoEstadoDeCita ($status)_CuandoSeEvaluaColorEtiquetaYCancelabilidad_EntoncesRetornaValoresCorrectos',
    ({ status, expectedColor, expectedLabel, isCancellable }) => {
      // Arrange
      const currentStatus = status;

      // Act
      const color = CalendarDomainLogic.getStatusColor(currentStatus);
      const label = CalendarDomainLogic.statusLabel(currentStatus);
      const cancellable = CalendarDomainLogic.isCancellable(currentStatus);

      // Assert
      expect(color).toBe(expectedColor);
      expect(label).toBe(expectedLabel);
      expect(cancellable).toBe(isCancellable);
    }
  );

  test('DadoHorarioLaboralDe8A15Media_CuandoSeGeneranSlotsDeMediaHora_EntoncesRetorna16BloquesHorarios', () => {
    // Arrange
    const startHour = 8;
    const finishHour = 15.5;

    // Act
    const hours = CalendarDomainLogic.generateHoursArray(startHour, finishHour);

    // Assert
    expect(hours).toHaveLength(16);
    expect(hours[0]).toBe('08:00');
    expect(hours[1]).toBe('08:30');
    expect(hours[hours.length - 1]).toBe('15:30');
  });

  test('DadoRangoDeHorasInvertido_CuandoSeIntentaGenerarArregloDeHoras_EntoncesLanzaErrorDeNegocio', () => {
    // Arrange
    const startHour = 16;
    const finishHour = 8;

    // Act
    const action = () => CalendarDomainLogic.generateHoursArray(startHour, finishHour);

    // Assert
    expect(action).toThrow('La hora final no puede ser menor que la hora inicial.');
  });
});
