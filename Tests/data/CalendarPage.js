/**
 * Patrón Page Object Model (POM) / Fixture compartido de UI:
 * Encapsula los selectores y acciones de la página del calendario.
 * Ubicado en Tests/data/ bajo la arquitectura plana y desacoplada.
 */
class CalendarPage {
  /**
   * @param {object} page Instancia de página (Playwright Page o mock equivalente)
   */
  constructor(page) {
    if (!page) {
      throw new Error('Se requiere una instancia válida de page para inicializar CalendarPage.');
    }
    this._page = page;
  }

  /**
   * Selector del primer botón disponible para agendar horario
   */
  get scheduleButton() {
    return this._page.locator('.btn-schedule').first();
  }

  /**
   * Selector del encabezado con el título del mes actual
   */
  get monthHeader() {
    return this._page.locator('.month-left h1');
  }

  /**
   * Navega a la ruta del calendario a partir de la URL base del frontend.
   * @param {string} baseUrl
   */
  async goto(baseUrl) {
    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('La URL base es obligatoria para navegar al calendario.');
    }
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    await this._page.goto(`${normalizedBase}calendar`);
  }

  /**
   * Obtiene el texto del encabezado del mes en el calendario.
   * @returns {Promise<string|null>}
   */
  async getMonthTitle() {
    return await this.monthHeader.textContent();
  }

  /**
   * Hace clic en el primer horario disponible para agendar.
   */
  async clickFirstAvailableScheduleSlot() {
    await this.scheduleButton.click();
  }
}

module.exports = { CalendarPage };
