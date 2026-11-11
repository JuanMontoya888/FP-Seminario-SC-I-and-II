/**
 * Pruebas del servicio de correo: proveedor por variable de entorno (Resend / SMTP),
 * tiempos máximos y que nunca rechace (los controladores lo llaman sin await).
 * Patrón AAA estricto.
 */
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }), { virtual: true });

describe('Unit Services - Mailer', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  const loadMailer = () => {
    let mailer;
    jest.isolateModules(() => {
      mailer = require('../../../Back-End/services/mailer');
    });
    return mailer;
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    mockSendMail.mockReset();
    mockCreateTransport.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  test('DadoRESEND_API_KEY_CuandoSeEnviaUnCorreo_EntoncesUsaLaApiHttpDeResendConTimeout', async () => {
    // Arrange
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.EMAIL_FROM = 'Dental One <citas@example.com>';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'email_1' }) });
    const { enviarCorreoSMTP } = loadMailer();

    // Act
    const result = await enviarCorreoSMTP({ to: 'ana@example.com', subject: 'Hola', html: '<p>Hola</p>' });

    // Assert
    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_test_123' }),
        signal: expect.anything()
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toEqual({ from: 'Dental One <citas@example.com>', to: ['ana@example.com'], subject: 'Hola', html: '<p>Hola</p>' });
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  test('DadoFalloDeRed_CuandoSeEnviaConResend_EntoncesDevuelveOkFalseSinRechazar', async () => {
    // Arrange
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_123';
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    const { enviarCorreoSMTP } = loadMailer();

    // Act
    const result = await enviarCorreoSMTP({ to: 'ana@example.com', subject: 'Hola', html: '<p>Hola</p>' });

    // Assert
    expect(result.ok).toBe(false);
  });

  test('DadoSinProveedorHttp_CuandoSeEnviaUnCorreo_EntoncesUsaSMTPConTimeoutsCortos', async () => {
    // Arrange
    process.env.EMAIL_USER = 'clinica@example.com';
    process.env.EMAIL_PASS = 'abcd efgh';
    mockSendMail.mockRejectedValue(new Error('Connection timeout'));
    const { enviarCorreoSMTP } = loadMailer();

    // Act
    const result = await enviarCorreoSMTP({ to: 'ana@example.com', subject: 'Hola', html: '<p>Hola</p>' });

    // Assert
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        auth: { user: 'clinica@example.com', pass: 'abcdefgh' }
      })
    );
    expect(result.ok).toBe(false);
  });
});
