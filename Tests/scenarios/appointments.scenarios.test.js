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

const mockAppointmentSave = jest.fn().mockResolvedValue(true);
const MockAppointmentModel = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'appt_scenario_1',
  save: mockAppointmentSave
}));
MockAppointmentModel.find = jest.fn();
MockAppointmentModel.findById = jest.fn();

jest.mock('../../Back-End/models/scheduling', () => MockAppointmentModel);

jest.mock('../../Back-End/models/blockedSlot', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  bulkWrite: jest.fn()
}));

jest.mock('../../Back-End/models/users', () => ({
  findOne: jest.fn()
}));

jest.mock('../../Back-End/services/mailer', () => ({
  enviarCorreoSMTP: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../Back-End/services/emailTemplates', () => ({
  citaConfirmada: jest.fn().mockReturnValue('<html>Confirmada</html>'),
  citaCancelada: jest.fn().mockReturnValue('<html>Cancelada</html>')
}));

jest.mock('../../Back-End/services/whatsappService', () => ({
  sendAppointmentReminder: jest.fn().mockResolvedValue(true)
}));

const Appointment = require('../../Back-End/models/scheduling');
const BlockedSlot = require('../../Back-End/models/blockedSlot');
const User = require('../../Back-End/models/users');
const appointmentController = require('../../Back-End/controllers/appointment.controller');

/**
 * Suite de pruebas unitarias para Escenarios Complejos (Scenarios) de Appointments.
 * Ubicada en Tests/scenarios/ bajo la arquitectura plana y desacoplada.
 */
describe('Scenarios - Appointments Complex Behavior Flows', () => {
  const createMockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  });

  test('DadoHorarioBloqueadoPorAdmin_CuandoPacienteIntentaAgendarEnEsaHora_EntoncesRechazaCon409Conflict', async () => {
    // Arrange
    const req = {
      user: { id: 'patient_1' },
      body: {
        dateTime: '2026-11-15T10:00:00.000Z',
        hour: '10:00',
        durationMinutes: 30,
        patientName: 'Juan Pérez',
        email: 'juan@example.com',
        reason: 'Limpieza dental',
        providerName: 'Dr. Juan'
      }
    };
    const res = createMockRes();
    User.findOne.mockResolvedValue({ _id: 'patient_1' });
    BlockedSlot.findOne.mockResolvedValue({ date: '2026-11-15', hour: '10:00' });

    // Act
    await appointmentController.createAppointment(req, res);

    // Assert
    expect(BlockedSlot.findOne).toHaveBeenCalledWith({ date: '2026-11-15', hour: '10:00' });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      msg: 'Ese horario no está disponible. Por favor selecciona otro.'
    });
    expect(mockAppointmentSave).not.toHaveBeenCalled();
  });

  test('DadoEspecialistaConCitaActiva_CuandoOtroPacienteIntentaSolaparHorario_EntoncesRechazaCon409Conflict', async () => {
    // Arrange
    const req = {
      user: { id: 'patient_2' },
      body: {
        dateTime: '2026-11-15T10:00:00.000Z',
        hour: '10:15',
        durationMinutes: 30,
        patientName: 'María López',
        email: 'maria@example.com',
        reason: 'Ortodoncia',
        providerName: 'Dra. Lopez'
      }
    };
    const res = createMockRes();
    User.findOne.mockResolvedValue({ _id: 'patient_2' });
    BlockedSlot.findOne.mockResolvedValue(null);
    Appointment.find.mockResolvedValue([
      {
        dateTime: new Date('2026-11-15T10:00:00.000Z'),
        hour: '10:00',
        durationMinutes: 30,
        providerName: 'Dra. Lopez',
        status: 'Scheduled'
      }
    ]);

    // Act
    await appointmentController.createAppointment(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      msg: 'El especialista Dra. Lopez ya tiene una cita ocupada a las 10:00. Por favor selecciona otro horario.'
    });
    expect(mockAppointmentSave).not.toHaveBeenCalled();
  });

  test('DadoHorarioLibreYValido_CuandoPacienteAgendaCita_EntoncesGuardaYRetorna201Created', async () => {
    // Arrange
    const req = {
      user: { id: 'patient_3' },
      body: {
        dateTime: '2026-11-15T11:00:00.000Z',
        hour: '11:00',
        durationMinutes: 30,
        patientName: 'Carlos Ruiz',
        contactNumber: '5512345678',
        email: 'carlos@example.com',
        reason: 'Valoración general',
        providerName: 'Dr. Juan'
      }
    };
    const res = createMockRes();
    User.findOne.mockResolvedValue({ _id: 'patient_3' });
    BlockedSlot.findOne.mockResolvedValue(null);
    Appointment.find.mockResolvedValue([]);

    // Act
    await appointmentController.createAppointment(req, res);

    // Assert
    expect(mockAppointmentSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Cita registrada exitosamente.',
        appointment: expect.objectContaining({
          patientName: 'Carlos Ruiz',
          hour: '11:00',
          providerName: 'Dr. Juan',
          status: 'Scheduled'
        })
      })
    );
  });
});
