const { TestSettings } = require('../../data/testSettings');
const { CalendarPage } = require('../../data/CalendarPage');
const { calendarMonthCases, invalidBaseUrlCases } = require('../../data/calendar.sources');

/**
 * Suite de pruebas unitarias para el componente de UI Calendar.
 * Ubicada en Tests/unit/components/ bajo la arquitectura plana y desacoplada.
 * Aplica estrictamente el patrón AAA (Arrange, Act, Assert) y aislamiento mediante mocks.
 */
describe('Unit Components - Calendar UI & Page Object Tests', () => {
  let mockFirstScheduleLocator;
  let mockScheduleLocator;
  let mockMonthHeaderLocator;
  let mockPage;

  beforeEach(() => {
    mockFirstScheduleLocator = {
      click: jest.fn().mockResolvedValue(undefined)
    };
    mockScheduleLocator = {
      first: jest.fn().mockReturnValue(mockFirstScheduleLocator)
    };
    mockMonthHeaderLocator = {
      textContent: jest.fn().mockResolvedValue('Octubre')
    };

    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      title: jest.fn().mockResolvedValue('Dental-One'),
      locator: jest.fn((selector) => {
        if (selector === '.btn-schedule') return mockScheduleLocator;
        if (selector === '.month-left h1') return mockMonthHeaderLocator;
        return { first: jest.fn(), textContent: jest.fn() };
      })
    };
  });

  test('DadoPaginaDeCalendario_CuandoSeCargaCorrectamente_EntoncesMuestraTituloYMesSinErrores (CalendarPage_ShouldLoadCorrectlyAndShowMonth)', async () => {
    // Arrange
    const calendarPage = new CalendarPage(mockPage);

    // Act
    await calendarPage.goto(TestSettings.FrontendBaseUrl);
    const title = await mockPage.title();
    const monthTitle = await calendarPage.getMonthTitle();

    // Assert
    expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:4200/calendar');
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(monthTitle).toBe('Octubre');
  });

  test.each(calendarMonthCases)(
    'DadoCalendarioEnMes ($monthTitle)_CuandoSeConsultaEncabezado_EntoncesRetornaNombreDelMesEsperado',
    async ({ monthTitle, pageTitle }) => {
      // Arrange
      mockMonthHeaderLocator.textContent.mockResolvedValueOnce(monthTitle);
      mockPage.title.mockResolvedValueOnce(pageTitle);
      const calendarPage = new CalendarPage(mockPage);

      // Act
      await calendarPage.goto(TestSettings.FrontendBaseUrl);
      const currentMonth = await calendarPage.getMonthTitle();
      const currentTitle = await mockPage.title();

      // Assert
      expect(mockPage.locator).toHaveBeenCalledWith('.month-left h1');
      expect(currentMonth).toBe(monthTitle);
      expect(currentTitle).toContain(monthTitle);
    }
  );

  test('DadoSlotDisponibleEnCalendario_CuandoUsuarioHaceClicEnPrimerHorario_EntoncesEjecutaAccionDeAgendar', async () => {
    // Arrange
    const calendarPage = new CalendarPage(mockPage);

    // Act
    await calendarPage.clickFirstAvailableScheduleSlot();

    // Assert
    expect(mockPage.locator).toHaveBeenCalledWith('.btn-schedule');
    expect(mockScheduleLocator.first).toHaveBeenCalledTimes(1);
    expect(mockFirstScheduleLocator.click).toHaveBeenCalledTimes(1);
  });

  test('DadoInstanciaNulaDePage_CuandoSeConstruyeCalendarPage_EntoncesLanzaErrorExplicito', () => {
    // Arrange
    const invalidPage = null;

    // Act
    const instantiateInvalidPage = () => new CalendarPage(invalidPage);

    // Assert
    expect(instantiateInvalidPage).toThrow('Se requiere una instancia válida de page para inicializar CalendarPage.');
  });

  test.each(invalidBaseUrlCases)(
    'DadoUrlBaseInvalida ($invalidUrl)_CuandoSeIntentaNavegarAlCalendario_EntoncesLanzaErrorDeValidacion',
    async ({ invalidUrl }) => {
      // Arrange
      const calendarPage = new CalendarPage(mockPage);

      // Act
      const navigatePromise = calendarPage.goto(invalidUrl);

      // Assert
      await expect(navigatePromise).rejects.toThrow('La URL base es obligatoria para navegar al calendario.');
      expect(mockPage.goto).not.toHaveBeenCalled();
    }
  );
});
