const { invalidRangeCases, nonCancellableStatuses } = require('../../data/appointments.sources');

jest.mock(
  'googleapis',
  () => ({
    google: {
      auth: { GoogleAuth: jest.fn() },
      calendar: jest.fn()
    }
  }),
  { virtual: true }
);

const mockAppointmentSave = jest.fn();
const MockAppointmentModel = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'appt_mock_id_1',
  save: mockAppointmentSave
}));
MockAppointmentModel.find = jest.fn();
MockAppointmentModel.findById = jest.fn();

jest.mock('../../../Back-End/models/scheduling', () => MockAppointmentModel);

jest.mock('../../../Back-End/models/blockedSlot', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  bulkWrite: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../../../Back-End/models/users', () => ({
  findOne: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../../../Back-End/services/mailer', () => ({
  enviarCorreoSMTP: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../Back-End/services/emailTemplates', () => ({
  citaConfirmada: jest.fn().mockReturnValue('<p>Cita confirmada</p>'),
  citaCancelada: jest.fn().mockReturnValue('<p>Cita cancelada</p>')
}));

jest.mock('../../../Back-End/services/whatsappService', () => ({
  sendAppointmentReminder: jest.fn().mockResolvedValue(true)
}));

const Appointment = require('../../../Back-End/models/scheduling');
const BlockedSlot = require('../../../Back-End/models/blockedSlot');
const appointmentController = require('../../../Back-End/controllers/appointment.controller');

/**
 * Suite de pruebas unitarias para la capa Controller de Appointments.
 * Ubicada en Tests/unit/controllers/ bajo la arquitectura plana y desacoplada.
 */
describe('Unit Controllers - Appointments Controller Tests', () => {
  const createMockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  });

  test('DadoUsuarioAutenticado_CuandoConsultaGetAvailability_EntoncesRetorna200ConOcupadosYBloqueados', async () => {
    // Arrange
    const req = {
      user: { id: 'user_123', role: 'patient' }
    };
    const res = createMockRes();

    const mockActiveAppointments = [
      {
        dateTime: new Date('2026-10-30T10:00:00.000Z'),
        hour: '10:00',
        durationMinutes: 30,
        user: 'user_123'
      }
    ];
    const mockBlockedSlots = [
      { date: '2026-10-30', hour: '12:00', reason: 'Comida' }
    ];

    Appointment.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockActiveAppointments)
    });
    BlockedSlot.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockBlockedSlots)
    });

    // Act
    await appointmentController.getAvailability(req, res);

    // Assert
    expect(Appointment.find).toHaveBeenCalledWith({ status: { $ne: 'Canceled' } });
    expect(res.json).toHaveBeenCalledWith({
      occupied: [
        {
          dateTime: mockActiveAppointments[0].dateTime,
          hour: '10:00',
          durationMinutes: 30,
          mine: true
        }
      ],
      blocked: [{ date: '2026-10-30', hour: '12:00', reason: 'Comida' }]
    });
  });

  test('DadoUsuarioNoAdmin_CuandoIntentaObtenerTodasLasCitasGlobales_EntoncesRetorna403Forbidden', async () => {
    // Arrange
    const req = {
      user: { id: 'user_123', role: 'patient' }
    };
    const res = createMockRes();

    // Act
    await appointmentController.getAllAppointments(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: 'Acceso denegado. Se requieren permisos de administrador.'
    });
    expect(Appointment.find).not.toHaveBeenCalled();
  });

  test.each(nonCancellableStatuses)(
    'DadoCitaEnEstado ($status)_CuandoAdminIntentaCancelar_EntoncesRetorna400BadRequest',
    async ({ status }) => {
      // Arrange
      const req = { params: { id: 'appt_999' } };
      const res = createMockRes();
      Appointment.findById.mockResolvedValue({
        _id: 'appt_999',
        status,
        save: jest.fn()
      });

      // Act
      await appointmentController.cancelAppointment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'No se puede cancelar una cita ya pagada o completada desde aquí.'
      });
    }
  );

  test.each(invalidRangeCases)(
    'DadoRangoInvalido ($description)_CuandoAdminIntentaBloquearRango_EntoncesRetorna400BadRequest',
    async ({ payload, expectedStatus, expectedMsg }) => {
      // Arrange
      const req = {
        user: { id: 'admin_1', role: 'admin' },
        body: payload
      };
      const res = createMockRes();

      // Act
      await appointmentController.blockRange(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith({ msg: expectedMsg });
      expect(BlockedSlot.bulkWrite).not.toHaveBeenCalled();
    }
  );
});
