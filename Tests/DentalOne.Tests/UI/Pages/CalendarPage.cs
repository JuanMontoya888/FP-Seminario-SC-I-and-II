using System.Threading.Tasks;
using Microsoft.Playwright;

namespace DentalOne.Tests.UI.Pages
{
    /// <summary>
    /// Patrón Page Object Model: Encapsula los selectores y acciones de la página del calendario.
    /// </summary>
    public class CalendarPage
    {
        private readonly IPage _page;

        // Selectores de los elementos de la página
        private ILocator ScheduleButton => _page.Locator(".btn-schedule").First;
        private ILocator MonthHeader => _page.Locator(".month-left h1");

        public CalendarPage(IPage page)
        {
            _page = page;
        }

        public async Task GotoAsync(string baseUrl)
        {
            await _page.GotoAsync($"{baseUrl}calendar");
        }

        public async Task<string?> GetMonthTitleAsync()
        {
            return await MonthHeader.TextContentAsync();
        }

        public async Task ClickFirstAvailableScheduleSlotAsync()
        {
            await ScheduleButton.ClickAsync();
        }
    }
}
