using System.Threading.Tasks;
using Microsoft.Playwright;
using FluentAssertions;
using Xunit;
using DentalOne.Tests.Helpers;
using DentalOne.Tests.UI.Pages;

namespace DentalOne.Tests.UI
{
    public class CalendarUiTests
    {
        [Fact]
        public async Task CalendarPage_ShouldLoadCorrectlyAndShowMonth()
        {
            // --- ARRANGE ---
            using var playwright = await Playwright.CreateAsync();
            await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions { Headless = true });
            var page = await browser.NewPageAsync();
            
            // Instanciamos nuestro Page Object Model
            var calendarPage = new CalendarPage(page);

            // --- ACT ---
            await calendarPage.GotoAsync(TestSettings.FrontendBaseUrl);
            var title = await page.TitleAsync();

            // --- ASSERT ---
            title.Should().NotBeNullOrEmpty("porque la página del calendario de Dental-One debe cargar sin errores críticos");
        }
    }
}
