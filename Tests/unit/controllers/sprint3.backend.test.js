/**
 * Suite de pruebas unitarias para entregables de Backend del Sprint 3 (CDONE-50, CDONE-55, CDONE-58, CDONE-60).
 * Patrón AAA estricto.
 */

// Mock de servicios externos
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

jest.mock('../../../Back-End/services/mailer', () => ({
  enviarCorreoSMTP: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../Back-End/services/emailTemplates', () => ({
  citaConfirmada: jest.fn().mockReturnValue('<p>Confirmada</p>'),
  citaCancelada: jest.fn().mockReturnValue('<p>Cancelada</p>'),
  pagoRecibido: jest.fn().mockReturnValue('<p>Pago OK</p>'),
  pagoRechazado: jest.fn().mockReturnValue('<p>Pago Rechazado</p>')
}));

jest.mock('../../../Back-End/services/whatsappService', () => ({
  sendAppointmentReminder: jest.fn().mockResolvedValue(true)
}));

// Mock de SDK de Mercado Pago
const mockPaymentGet = jest.fn();
jest.mock(
  'mercadopago',
  () => ({
    MercadoPagoConfig: jest.fn(),
    Payment: jest.fn().mockImplementation(() => ({
      get: mockPaymentGet
    })),
    Preference: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ id: 'pref_123', init_point: 'https://mp.com/init' })
    }))
  }),
  { virtual: true }
);

// Mocks de modelos Mongoose
const mockAppointmentSave = jest.fn().mockResolvedValue(true);
const MockAppointment = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'appt_sprint3_1',
  save: mockAppointmentSave
}));
MockAppointment.find = jest.fn();
MockAppointment.findById = jest.fn();
MockAppointment.findByIdAndUpdate = jest.fn();
MockAppointment.updateMany = jest.fn();

jest.mock('../../../Back-End/models/scheduling', () => MockAppointment);

const mockUserSave = jest.fn().mockResolvedValue(true);
const MockUser = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
};
jest.mock('../../../Back-End/models/users', () => MockUser);

const MockPatientDetails = {
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn()
};
jest.mock('../../../Back-End/models/patientDetails', () => MockPatientDetails);

const MockMedicalHistory = {
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn()
};
jest.mock('../../../Back-End/models/medicalHistory', () => MockMedicalHistory);

const MockBlockedSlot = {
  findOne: jest.fn(),
  find: jest.fn()
};
jest.mock('../../../Back-End/models/blockedSlot', () => MockBlockedSlot);

// Importar controladores bajo prueba
const appointmentController = require('../../../Back-End/controllers/appointment.controller');
const patientController = require('../../../Back-End/controllers/patient.controller');
const mpController = require('../../../Back-End/controllers/mercado_pago.controller');
const { enviarCorreoSMTP } = require('../../../Back-End/services/mailer');

describe('Sprint 3 Backend Deliverables Validation', () => {
  const createRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // CDONE-50: Optimización de consultas en MongoDB
  // =========================================================================
  describe('CDONE-50: Optimización de consultas en MongoDB', () => {
    test('DadoUsuarioAutenticado_CuandoConsultaCitas_EntoncesEjecutaFindConProyeccionYLean', async () => {
      // Arrange
      const req = { user: { id: 'usr_123', role: 'user' } };
      const res = createRes();
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ dateTime: new Date(), hour: '10:00' }])
      };
      MockAppointment.find.mockReturnValue(mockChain);
      MockBlockedSlot.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      MockAppointment.updateMany.mockResolvedValue({ modifiedCount: 0 });

      // Act
      await appointmentController.getAvailability(req, res);

      // Assert
      expect(MockAppointment.find).toHaveBeenCalledWith({
        status: { $nin: ['Canceled', 'Payment_Failed'] },
        dateTime: { $gte: expect.any(Date) }
      });
      expect(mockChain.select).toHaveBeenCalledWith('dateTime hour durationMinutes user');
      expect(mockChain.lean).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CDONE-55: Transacciones y consistencia del expediente clínico
  // =========================================================================
  describe('CDONE-55: Transacciones de guardado del expediente clínico', () => {
    test('DadoDatosDePaciente_CuandoUpsertPatientDetails_EntoncesActualizaReferenciaEnUser', async () => {
      // Arrange
      const mockUserDoc = {
        _id: 'usr_paciente_1',
        email: 'paciente@example.com',
        patientDetails: null,
        save: mockUserSave
      };
      MockUser.findById.mockResolvedValue(mockUserDoc);
      MockPatientDetails.findOneAndUpdate.mockResolvedValue({
        _id: 'pdetails_999',
        user: 'usr_paciente_1',
        numcel: '5511223344'
      });

      const req = {
        user: { id: 'usr_paciente_1' },
        body: {
          email: 'paciente@example.com',
          nombre: 'Juan',
          apep: 'Perez',
          apem: 'Gomez',
          numcel: '5511223344'
        }
      };
      const res = createRes();

      // Act
      await patientController.upsertPatientDetails(req, res);

      // Assert
      expect(MockPatientDetails.findOneAndUpdate).toHaveBeenCalledWith(
        { user: 'usr_paciente_1' },
        expect.any(Object),
        expect.objectContaining({ upsert: true, new: true, runValidators: true })
      );
      expect(mockUserDoc.patientDetails).toBe('pdetails_999');
      expect(mockUserSave).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('DadoExpedienteCompleto_CuandoSaveCompleteClinicalRecord_EntoncesGuardaDetallesYHistorial', async () => {
      // Arrange
      const mockUserDoc = {
        _id: 'usr_paciente_2',
        email: 'test@example.com',
        save: mockUserSave
      };
      MockUser.findById.mockResolvedValue(mockUserDoc);
      MockPatientDetails.findOneAndUpdate.mockResolvedValue({ _id: 'pdetails_1' });
      MockMedicalHistory.findOneAndUpdate.mockResolvedValue({ _id: 'mhistory_1' });

      const req = {
        user: { id: 'usr_paciente_2' },
        body: {
          patientDetails: { nombre: 'Carlos', apep: 'Ruiz', numcel: '5544332211' },
          medicalHistory: { salud: 'Buena', padecimiento: 'Ninguno' }
        }
      };
      const res = createRes();

      // Act
      await patientController.saveCompleteClinicalRecord(req, res);

      // Assert
      expect(MockPatientDetails.findOneAndUpdate).toHaveBeenCalled();
      expect(MockMedicalHistory.findOneAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Expediente clínico guardado exitosamente.'
        })
      );
    });
  });

  // =========================================================================
  // CDONE-58: Integración del SDK de Mercado Pago e Idempotencia
  // =========================================================================
  describe('CDONE-58: Integración SDK de Mercado Pago', () => {
    test('DadoPagoAprobadoRepetido_CuandoWebhookRecibeNotificacion_EntoncesAplicaIdempotenciaYNoReenviaCorreo', async () => {
      // Arrange
      const req = {
        query: { 'data.id': 'pay_987654', type: 'payment' },
        headers: {}
      };
      const res = createRes();
      mockPaymentGet.mockResolvedValue({
        id: 'pay_987654',
        status: 'approved',
        metadata: { appointment_id: 'appt_ya_confirmada' }
      });
      MockAppointment.findById.mockResolvedValue({
        _id: 'appt_ya_confirmada',
        status: 'Confirmed',
        user: 'usr_1'
      });

      // Act
      await mpController.receiveWebhook(req, res);

      // Assert
      expect(mockPaymentGet).toHaveBeenCalledWith({ id: 'pay_987654' });
      expect(MockAppointment.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(enviarCorreoSMTP).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });

    test('DadoPagoAprobadoNuevo_CuandoWebhookRecibeNotificacion_EntoncesConfirmaCitaYRemueveTimeout', async () => {
      // Arrange
      const req = {
        query: { 'data.id': 'pay_nuevo_1', type: 'payment' },
        headers: {}
      };
      const res = createRes();
      mockPaymentGet.mockResolvedValue({
        id: 'pay_nuevo_1',
        status: 'approved',
        transaction_amount: 950,
        metadata: { appointment_id: 'appt_pendiente_1' }
      });
      MockAppointment.findById.mockResolvedValue({
        _id: 'appt_pendiente_1',
        status: 'Payment_Pending',
        user: 'usr_paciente_3',
        reason: 'Limpieza dental'
      });
      MockAppointment.findByIdAndUpdate.mockResolvedValue({
        _id: 'appt_pendiente_1',
        status: 'Confirmed',
        user: 'usr_paciente_3',
        reason: 'Limpieza dental'
      });
      MockUser.findById.mockResolvedValue({
        _id: 'usr_paciente_3',
        email: 'paciente3@example.com',
        nombre: 'Laura'
      });
      MockUser.findByIdAndUpdate.mockResolvedValue(true);

      // Act
      await mpController.receiveWebhook(req, res);

      // Assert
      expect(MockAppointment.findByIdAndUpdate).toHaveBeenCalledWith(
        'appt_pendiente_1',
        { status: 'Confirmed', $unset: { expiresAt: 1 } },
        { new: true }
      );
      expect(MockUser.findByIdAndUpdate).toHaveBeenCalledWith('usr_paciente_3', { canPayAtClinic: true });
      expect(enviarCorreoSMTP).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // =========================================================================
  // CDONE-60: Lógica de reserva temporal con timeout en el servidor
  // =========================================================================
  describe('CDONE-60: Reserva temporal con timeout en servidor', () => {
    test('DadoAgendamientoConPagoEnLinea_CuandoSeCreaLaCita_EntoncesAsignaExpiresAtEnServidor', async () => {
      // Arrange
      const req = {
        user: { id: 'usr_timeout_1' },
        body: {
          dateTime: '2026-11-20T10:00:00.000Z',
          hour: '10:00',
          durationMinutes: 30,
          patientName: 'Roberto Ruiz',
          email: 'roberto@example.com',
          reason: 'Valoración general',
          providerName: 'Dra. Elena Sonrisa'
        }
      };
      const res = createRes();
      MockUser.findOne.mockResolvedValue({ _id: 'usr_timeout_1' });
      MockBlockedSlot.findOne.mockResolvedValue(null);
      MockAppointment.find.mockResolvedValue([]);
      MockAppointment.updateMany.mockResolvedValue({ modifiedCount: 0 });

      // Act
      await appointmentController.createAppointment(req, res);

      // Assert
      expect(MockAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Scheduled',
          expiresAt: expect.any(Date)
        })
      );
      expect(mockAppointmentSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('DadoAgendamientoConPagoEnClinica_CuandoSeCreaLaCita_EntoncesExpiresAtEsNulo', async () => {
      // Arrange
      const req = {
        user: { id: 'usr_timeout_2' },
        body: {
          dateTime: '2026-11-20T11:00:00.000Z',
          hour: '11:00',
          durationMinutes: 30,
          patientName: 'Sofia Gomez',
          email: 'sofia@example.com',
          reason: 'Ajuste de brackets',
          providerName: 'Dra. Sofía Frenillos',
          status: 'Pending_Clinic_Payment'
        }
      };
      const res = createRes();
      MockUser.findOne.mockResolvedValue({ _id: 'usr_timeout_2' });
      MockBlockedSlot.findOne.mockResolvedValue(null);
      MockAppointment.find.mockResolvedValue([]);
      MockAppointment.updateMany.mockResolvedValue({ modifiedCount: 0 });

      // Act
      await appointmentController.createAppointment(req, res);

      // Assert
      expect(MockAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Pending_Clinic_Payment',
          expiresAt: null
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('DadoReservasVencidas_CuandoSeEjecutaCleanup_EntoncesCancelaCitasYLiberaSlots', async () => {
      // Arrange
      MockAppointment.updateMany.mockResolvedValue({ modifiedCount: 3 });

      // Act
      const result = await appointmentController.cleanupExpiredReservations();

      // Assert
      expect(MockAppointment.updateMany).toHaveBeenCalledWith(
        {
          status: { $in: ['Scheduled', 'Payment_Pending'] },
          expiresAt: { $ne: null, $lt: expect.any(Date) }
        },
        {
          status: 'Canceled',
          notes: 'Cancelada automáticamente: tiempo de reserva agotado',
          $unset: { expiresAt: 1 }
        }
      );
      expect(result.modifiedCount).toBe(3);
    });
  });
});
