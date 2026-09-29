using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;
using DentalOne.Tests.Helpers;

namespace DentalOne.Tests.API
{
    public class AppointmentsApiTests
    {
        private readonly HttpClient _client;

        public AppointmentsApiTests()
        {
            _client = new HttpClient();
            _client.BaseAddress = new System.Uri(TestSettings.ApiBaseUrl);
        }

        [Fact]
        public async Task BackendHealth_ShouldBeReachable()
        {
            // --- ARRANGE ---
            // Usamos un endpoint público que no requiere autenticación

            // --- ACT ---
            var response = await _client.GetAsync("mercado-pago");

            // --- ASSERT ---
            response.StatusCode.Should().NotBe(HttpStatusCode.ServiceUnavailable,
                "porque el servidor de Node.js debe estar corriendo y accesible");

            response.StatusCode.Should().NotBe(HttpStatusCode.BadGateway,
                "porque el servidor no debe estar caído");
        }

        [Fact]
        public async Task GetAvailability_WithoutToken_ShouldReturn401()
        {
            // --- ARRANGE ---
            // Este endpoint requiere autenticación (authMiddleware en Node)

            // --- ACT ---
            var response = await _client.GetAsync("api/availability");

            // --- ASSERT ---
            // El comportamiento CORRECTO del servidor es rechazar sin token con 401 Unauthorized
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
                "porque el endpoint /api/availability está protegido y debe rechazar peticiones sin JWT");
        }
    }
}
