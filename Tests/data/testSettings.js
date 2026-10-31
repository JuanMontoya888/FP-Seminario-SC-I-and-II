/**
 * Configuración centralizada de URLs y constantes compartidas del entorno de pruebas.
 * Ubicado en Tests/data/ bajo la arquitectura plana y desacoplada.
 */
const TestSettings = Object.freeze({
  ApiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/',
  FrontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:4200/'
});

module.exports = { TestSettings };
