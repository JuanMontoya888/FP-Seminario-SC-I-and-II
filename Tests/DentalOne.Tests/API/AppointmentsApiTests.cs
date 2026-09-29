using System.Net.Http;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;
using DentalOne.Tests.Helpers;

namespace DentalOne.Tests.API
{
    public class AppointmentsApiTests
    {
        [Fact]
        public async Task GetAvailability_ShouldReturnSuccessStatusCode()
        {
            // --- ARRANGE ---
            using var client = new HttpClient();
            client.BaseAddress = new System.Uri(TestSettings.ApiBaseUrl);

            // --- ACT ---
            var response = await client.GetAsync("api/availability");

            // --- ASSERT ---
            response.IsSuccessStatusCode.Should().BeTrue("porque el endpoint de disponibilidad debe responder 200 OK");
        }
    }
}
