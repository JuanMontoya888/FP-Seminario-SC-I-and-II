/**
 * Pruebas de seguridad del flujo de citas y pagos:
 * - el precio se calcula en el servidor (no se confía en el cliente),
 * - el estado inicial de la cita no lo decide el cliente,
 * - el webhook valida el monto cobrado antes de confirmar.
 * Patrón AAA estricto.
 */

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
  enviarCorreoSMTP: jest.fn().mockResolvedValue({ ok: true })
}));

jest.mock('../../../Back-End/services/emailTemplates', () => ({
  citaConfirmada: jest.fn().mockReturnValue('<p>Confirmada</p>'),
  pagoRecibido: jest.fn().mockReturnValue('<p>Pago OK</p>'),
  pagoRechazado: jest.fn().mockReturnValue('<p>Pago Rechazado</p>')
}));

jest.mock('../../../Back-End/services/whatsappService', () => ({
  sendAppointmentReminder: jest.fn().mockResolvedValue(true)
}));

const mockPaymentGet = jest.fn();
jest.mock(
  'mercadopago',
  () => ({
    MercadoPagoConfig: jest.fn(),
    Payment: jest.fn().mockImplementation(() => ({ get: mockPaymentGet })),
    Preference: jest.fn().mockImplementation(() => ({ create: jest.fn() }))
  }),
  { virtual: true }
);

jest.mock('../../../Back-End/models/mercado_pago', () => ({
  crearPreferencia: jest.fn()
}));

const mockAppointmentSave = jest.fn();
const MockAppointment = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'appt_seg_1',
  save: mockAppointmentSave
}));
MockAppointment.find = jest.fn();
MockAppointment.findById = jest.fn();
MockAppointment.findByIdAndUpdate = jest.fn();
MockAppointment.updateMany = jest.fn();
jest.mock('../../../Back-End/models/scheduling', () => MockAppointment);

const MockUser = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
};
jest.mock('../../../Back-End/models/users', () => MockUser);

const MockBlockedSlot = { findOne: jest.fn(), find: jest.fn() };
jest.mock('../../../Back-End/models/blockedSlot', () => MockBlockedSlot);

const modelMP = require('../../../Back-End/models/mercado_pago');
const appointmentController = require('../../../Back-End/controllers/appointment.controller');
const mpController = require('../../../Back-End/controllers/mercado_pago.controller');

describe('Seguridad de citas y pagos', () => {
  const createRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  });

  const baseBody = {
    dateTime: '2026-11-20T00:00:00.000Z',
    hour: '10:00',
    patientName: 'Ana Torres',
    contactNumber: '5512345678',
    email: 'ana@example.com',
    reason: 'Endodoncia (Tratamiento de conducto)'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockBlockedSlot.findOne.mockResolvedValue(null);
    MockAppointment.find.mockResolvedValue([]);
    MockUser.findOne.mockResolvedValue(null);
    mockAppointmentSave.mockResolvedValue(true);
  });

  // =========================================================================
  // createAppointment: estado, duración y especialista
  // =========================================================================
  describe('createAppointment', () => {
    test('DadoDuracionYEspecialistaManipulados_CuandoSeCreaLaCita_EntoncesUsaLosDelCatalogo', async () => {
      // Arrange
      const req = {
        user: { id: 'usr_1' },
        body: { ...baseBody, durationMinutes: 1, providerName: 'Doctor Falso' }
      };
      const res = createRes();

      // Act
      await appointmentController.createAppointment(req, res);

      // Assert
      expect(MockAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMinutes: 90,
          providerName: 'Dr. Carlos Raíz',
          price: 3800,
          status: 'Scheduled'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('DadoTratamientoInexistente_CuandoSeCreaLaCita_EntoncesRetorna400', async () => {
      // Arrange
      const req = { user: { id: 'usr_1' }, body: { ...baseBody, reason: 'Tratamiento gratis' } };
      const res = createRes();

      // Act
      await appointmentController.createAppointment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockAppointmentSave).not.toHaveBeenCalled();
    });

    test('DadoEstadoConfirmedEnElBody_CuandoSeCreaLaCita_EntoncesRetorna400', async () => {
      // Arrange
      const req = { user: { id: 'usr_1' }, body: { ...baseBody, status: 'Confirmed' } };
      const res = createRes();

      // Act
      await appointmentController.createAppointment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Estado de cita no permitido.' });
      expect(mockAppointmentSave).not.toHaveBeenCalled();
    });

    test.each([
      { description: 'paciente nuevo', user: { _id: 'usr_1', patientType: 'new', canPayAtClinic: false } },
      { description: 'tipo de paciente sin elegir', user: { _id: 'usr_1', patientType: null, canPayAtClinic: false } }
    ])('DadoUsuarioSinPagoEnClinica ($description)_CuandoPidePendingClinicPayment_EntoncesRetorna403', async ({ user }) => {
      // Arrange
      MockUser.findById.mockResolvedValue(user);
      const req = { user: { id: 'usr_1' }, body: { ...baseBody, status: 'Pending_Clinic_Payment' } };
      const res = createRes();

      // Act
      await appointmentController.createAppointment(req, res);

      // Assert
      expect(MockUser.findById).toHaveBeenCalledWith('usr_1');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockAppointmentSave).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // proccesPay: el monto lo calcula el servidor
  // =========================================================================
  describe('proccesPay', () => {
    const pendingAppointment = (overrides = {}) => ({
      _id: 'appt_pay_1',
      user: 'usr_1',
      status: 'Scheduled',
      reason: 'Limpieza Dental y Revisión General',
      notes: '',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      save: jest.fn().mockResolvedValue(true),
      ...overrides
    });

    test.each([
      { paymentMode: 'full', expectedAmount: 600, expectedTitle: 'Limpieza Dental y Revisión General' },
      { paymentMode: 'partial', expectedAmount: 300, expectedTitle: 'Anticipo (50%) - Limpieza Dental y Revisión General' }
    ])('DadoPrecioManipuladoEnElBody_CuandoSePagaEnModo ($paymentMode)_EntoncesCobraElPrecioDelCatalogo', async ({ paymentMode, expectedAmount, expectedTitle }) => {
      // Arrange
      const cita = pendingAppointment();
      MockAppointment.findById.mockResolvedValue(cita);
      modelMP.crearPreferencia.mockResolvedValue({ id: 'pref_1', init_point: 'https://mp.com/init' });
      const req = {
        user: { id: 'usr_1' },
        body: { appointmentId: 'appt_pay_1', paymentMode, price: 1, title: 'Gratis', idUser: 'otro_usuario' }
      };
      const res = createRes();

      // Act
      await mpController.proccesPay(req, res);

      // Assert
      expect(modelMP.crearPreferencia).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expectedTitle,
          amount: expectedAmount,
          appointmentId: 'appt_pay_1',
          userId: 'usr_1'
        })
      );
      expect(cita.status).toBe('Payment_Pending');
      expect(cita.amountExpected).toBe(expectedAmount);
      expect(cita.paymentMode).toBe(paymentMode);
      expect(cita.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ init_point: 'https://mp.com/init', amount: expectedAmount, total: 600 })
      );
    });

    test('DadoReservaVigente_CuandoSeCreaLaPreferencia_EntoncesLimitaElCheckoutAlVencimientoDeLaReserva', async () => {
      // Arrange
      const cita = pendingAppointment({ dateTime: '2030-01-15T00:00:00.000Z', hour: '10:00' });
      MockAppointment.findById.mockResolvedValue(cita);
      modelMP.crearPreferencia.mockResolvedValue({ id: 'pref_1', init_point: 'https://mp.com/init' });
      const req = { user: { id: 'usr_1' }, body: { appointmentId: 'appt_pay_1', paymentMode: 'full' } };
      const res = createRes();

      // Act
      await mpController.proccesPay(req, res);

      // Assert
      const datos = modelMP.crearPreferencia.mock.calls[0][0];
      expect(datos.expiresAt).toEqual(cita.expiresAt);
      expect(datos.offlineDeadline).toBeInstanceOf(Date);
      expect(datos.offlineDeadline.getTime()).toBeGreaterThan(Date.now());
    });

    test('DadoReservaVencida_CuandoIntentaPagar_EntoncesRetorna400', async () => {
      // Arrange
      MockAppointment.findById.mockResolvedValue(
        pendingAppointment({ status: 'Payment_Pending', expiresAt: new Date(Date.now() - 1000) })
      );
      const req = { user: { id: 'usr_1' }, body: { appointmentId: 'appt_pay_1' } };
      const res = createRes();

      // Act
      await mpController.proccesPay(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(modelMP.crearPreferencia).not.toHaveBeenCalled();
    });

    test('DadoCitaDeOtroUsuario_CuandoIntentaPagarla_EntoncesRetorna403', async () => {
      // Arrange
      MockAppointment.findById.mockResolvedValue(pendingAppointment({ user: 'usr_otro' }));
      const req = { user: { id: 'usr_1' }, body: { appointmentId: 'appt_pay_1' } };
      const res = createRes();

      // Act
      await mpController.proccesPay(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(modelMP.crearPreferencia).not.toHaveBeenCalled();
    });

    test('DadoSinAppointmentId_CuandoIntentaPagar_EntoncesRetorna400', async () => {
      // Arrange
      const req = { user: { id: 'usr_1' }, body: { price: 10 } };
      const res = createRes();

      // Act
      await mpController.proccesPay(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(modelMP.crearPreferencia).not.toHaveBeenCalled();
    });

    test.each(['Confirmed', 'Canceled', 'Payment_Failed', 'Pending_Clinic_Payment'])(
      'DadoCitaEnEstado (%s)_CuandoIntentaPagarEnLinea_EntoncesRetorna400',
      async (status) => {
        // Arrange
        MockAppointment.findById.mockResolvedValue(pendingAppointment({ status }));
        const req = { user: { id: 'usr_1' }, body: { appointmentId: 'appt_pay_1' } };
        const res = createRes();

        // Act
        await mpController.proccesPay(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(modelMP.crearPreferencia).not.toHaveBeenCalled();
      }
    );
  });

  // =========================================================================
  // Webhook: validación del monto cobrado
  // =========================================================================
  describe('receiveWebhook', () => {
    test('DadoPagoAprobadoConMontoDistinto_CuandoLlegaElWebhook_EntoncesNoConfirmaLaCita', async () => {
      // Arrange
      const req = { query: { 'data.id': 'pay_1', type: 'payment' }, headers: {} };
      const res = createRes();
      mockPaymentGet.mockResolvedValue({
        id: 'pay_1',
        status: 'approved',
        transaction_amount: 1,
        metadata: { appointment_id: 'appt_pay_1' }
      });
      MockAppointment.findById.mockResolvedValue({
        _id: 'appt_pay_1',
        status: 'Payment_Pending',
        user: 'usr_1',
        notes: '',
        amountExpected: 600
      });

      // Act
      await mpController.receiveWebhook(req, res);

      // Assert
      expect(MockAppointment.findByIdAndUpdate).not.toHaveBeenCalledWith(
        'appt_pay_1',
        expect.objectContaining({ status: 'Confirmed' }),
        expect.anything()
      );
      expect(MockAppointment.findByIdAndUpdate).toHaveBeenCalledWith(
        'appt_pay_1',
        { notes: expect.stringContaining('revisar manualmente') }
      );
      expect(MockUser.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    const webhookReq = () => ({ query: { 'data.id': 'pay_2', type: 'payment' }, headers: {} });
    const citaWebhook = (overrides = {}) => ({
      _id: 'appt_wh_1',
      user: 'usr_1',
      status: 'Payment_Pending',
      dateTime: new Date('2030-01-15T00:00:00.000Z'),
      hour: '10:00',
      durationMinutes: 45,
      providerName: 'Dra. Elena Sonrisa',
      reason: 'Limpieza Dental y Revisión General',
      notes: '',
      amountExpected: 600,
      ...overrides
    });

    test('DadoPagoPendienteOXXO_CuandoLlegaElWebhook_EntoncesExtiendeLaReservaHastaElVencimientoDelPago', async () => {
      // Arrange
      const vencimientoFicha = '2029-12-01T12:00:00.000-06:00';
      mockPaymentGet.mockResolvedValue({
        id: 'pay_2',
        status: 'pending',
        date_of_expiration: vencimientoFicha,
        metadata: { appointment_id: 'appt_wh_1' }
      });
      MockAppointment.findById.mockResolvedValue(citaWebhook());
      const res = createRes();

      // Act
      await mpController.receiveWebhook(webhookReq(), res);

      // Assert
      expect(MockAppointment.findByIdAndUpdate).toHaveBeenCalledWith('appt_wh_1', {
        status: 'Payment_Pending',
        expiresAt: new Date(vencimientoFicha)
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('DadoPagoAprobadoParaCitaCanceladaConHorarioOcupado_CuandoLlegaElWebhook_EntoncesNoConfirmaYDejaNota', async () => {
      // Arrange
      mockPaymentGet.mockResolvedValue({
        id: 'pay_2',
        status: 'approved',
        transaction_amount: 600,
        metadata: { appointment_id: 'appt_wh_1' }
      });
      MockAppointment.findById.mockResolvedValue(citaWebhook({ status: 'Canceled' }));
      MockAppointment.find.mockResolvedValue([
        {
          _id: 'appt_otro_paciente',
          dateTime: new Date('2030-01-15T00:00:00.000Z'),
          hour: '10:30',
          durationMinutes: 30,
          providerName: 'Dra. Elena Sonrisa',
          status: 'Scheduled'
        }
      ]);
      const res = createRes();

      // Act
      await mpController.receiveWebhook(webhookReq(), res);

      // Assert
      expect(MockAppointment.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(MockAppointment.findByIdAndUpdate).toHaveBeenCalledWith('appt_wh_1', {
        notes: expect.stringContaining('reagendar o reembolsar')
      });
      expect(MockUser.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('DadoPagoAprobadoParaCitaCanceladaConHorarioLibre_CuandoLlegaElWebhook_EntoncesConfirmaConNota', async () => {
      // Arrange
      mockPaymentGet.mockResolvedValue({
        id: 'pay_2',
        status: 'approved',
        transaction_amount: 600,
        metadata: { appointment_id: 'appt_wh_1' }
      });
      MockAppointment.findById.mockResolvedValue(citaWebhook({ status: 'Canceled' }));
      // La propia cita (cancelada) no cuenta como conflicto
      MockAppointment.find.mockResolvedValue([]);
      MockAppointment.findByIdAndUpdate.mockResolvedValue(citaWebhook({ status: 'Confirmed' }));
      MockUser.findById.mockResolvedValue({ _id: 'usr_1', email: 'ana@example.com', nombre: 'Ana' });
      const res = createRes();

      // Act
      await mpController.receiveWebhook(webhookReq(), res);

      // Assert
      expect(MockAppointment.findByIdAndUpdate).toHaveBeenCalledWith(
        'appt_wh_1',
        {
          status: 'Confirmed',
          notes: expect.stringContaining('Reserva reactivada'),
          $unset: { expiresAt: 1 }
        },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('DadoCitaConfirmada_CuandoLlegaUnPagoRechazadoAtrasado_EntoncesNoLaDegrada', async () => {
      // Arrange
      mockPaymentGet.mockResolvedValue({
        id: 'pay_3',
        status: 'rejected',
        metadata: { appointment_id: 'appt_wh_1' }
      });
      MockAppointment.findById.mockResolvedValue(citaWebhook({ status: 'Confirmed' }));
      const res = createRes();

      // Act
      await mpController.receiveWebhook(webhookReq(), res);

      // Assert
      expect(MockAppointment.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // =========================================================================
  // Esquema: sin índice TTL que borre citas
  // =========================================================================
  test('DadoEsquemaDeCitas_CuandoSeRevisanLosIndices_EntoncesNoHayIndiceTTLSobreExpiresAt', () => {
    // Arrange
    const RealAppointment = jest.requireActual('../../../Back-End/models/scheduling');

    // Act
    const ttl = RealAppointment.schema
      .indexes()
      .filter(([fields, options]) => 'expiresAt' in fields && options && options.expireAfterSeconds !== undefined);

    // Assert
    expect(ttl).toHaveLength(0);
  });
});
