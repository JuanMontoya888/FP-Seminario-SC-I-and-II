const { TestSettings } = require('../../data/testSettings');
const { unauthorizedTokenCases } = require('../../data/appointments.sources');

jest.mock(
  'jsonwebtoken',
  () => ({
    verify: jest.fn(() => {
      throw new Error('invalid token');
    })
  }),
  { virtual: true }
);

jest.mock(
  'mercadopago',
  () => ({
    MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
    Payment: jest.fn().mockImplementation(() => ({
      get: jest.fn()
    }))
  }),
  { virtual: true }
);

jest.mock('../../../Back-End/models/mercado_pago', () => ({
  crearPreferencia: jest.fn()
}));
jest.mock('../../../Back-End/models/scheduling', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));
jest.mock('../../../Back-End/models/users', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));
jest.mock('../../../Back-End/services/mailer', () => ({
  enviarCorreoSMTP: jest.fn()
}));
jest.mock('../../../Back-End/services/emailTemplates', () => ({
  pagoRecibido: jest.fn(),
  pagoRechazado: jest.fn()
}));

/**
 * Suite de pruebas unitarias para los Endpoints / Contratos API de Appointments.
 * Ubicada en Tests/unit/controllers/ bajo la arquitectura plana y desacoplada.
 * Aplica estrictamente el patrón AAA (Arrange, Act, Assert) y aislamiento mediante mocks.
 */
describe('Unit Controllers - Appointments API & Endpoint Contract Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test_secret_for_unit_tests' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('DadoEndpointPublicoMercadoPago_CuandoSeVerificaSaludDelBackend_EntoncesRespondeExitosamenteSin503Ni502 (BackendHealth_ShouldBeReachable)', async () => {
    // Arrange
    const mpController = require('../../../Back-End/controllers/mercado_pago.controller');
    const endpointUrl = `${TestSettings.ApiBaseUrl}mercado-pago`;
    const req = { method: 'GET', url: endpointUrl };
    const res = {
      statusCode: 200,
      body: null,
      status: jest.fn(function (code) {
        this.statusCode = code;
        return this;
      }),
      send: jest.fn(function (payload) {
        this.body = payload;
        return this;
      })
    };

    // Act
    mpController.val(req, res);

    // Assert
    expect(TestSettings.ApiBaseUrl).toBe('http://localhost:3000/');
    expect(res.statusCode).not.toBe(503); // HttpStatusCode.ServiceUnavailable
    expect(res.statusCode).not.toBe(502); // HttpStatusCode.BadGateway
    expect(res.statusCode).toBe(200);
    expect(res.send).toHaveBeenCalledWith('Hola desde vista MP');
  });

  test('DadoEndpointProtegidoGetAvailability_CuandoSeInvocaSinTokenJWT_EntoncesRetorna401Unauthorized (GetAvailability_WithoutToken_ShouldReturn401)', async () => {
    // Arrange
    const authMiddleware = require('../../../Back-End/middlewares/auth.middleware');
    const req = {
      url: `${TestSettings.ApiBaseUrl}api/availability`,
      header: jest.fn().mockReturnValue(undefined)
    };
    const res = {
      statusCode: 200,
      status: jest.fn(function (code) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    // Act
    authMiddleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.statusCode).toBe(401); // HttpStatusCode.Unauthorized
    expect(res.json).toHaveBeenCalledWith({ msg: 'No autorizado, no hay token.' });
    expect(next).not.toHaveBeenCalled();
  });

  test.each(unauthorizedTokenCases)(
    'DadoPeticionAAvailability ($description)_CuandoSeValidaAutenticacion_EntoncesRechazaCon401',
    ({ headers, expectedStatus, expectedMsg }) => {
      // Arrange
      const authMiddleware = require('../../../Back-End/middlewares/auth.middleware');
      const req = {
        header: jest.fn((name) => headers[name])
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      // Act
      authMiddleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith({ msg: expectedMsg });
      expect(next).not.toHaveBeenCalled();
    }
  );
});
