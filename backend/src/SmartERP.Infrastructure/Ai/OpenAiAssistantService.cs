using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Ai;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Infrastructure.Ai;

public class OpenAiSettings
{
    public const string SectionName = "OpenAI";

    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gpt-4o-mini";
}

public class OpenAiAssistantService(
    HttpClient httpClient,
    IUnitOfWork unitOfWork,
    IOptions<OpenAiSettings> options) : IAiAssistantService
{
    private readonly OpenAiSettings _settings = options.Value;

    public async Task<AiAnswerDto> AskAsync(AskAiRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            throw new ConflictException("Sual boş ola bilməz.");

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            throw new ConflictException(
                "AI Assistant hələ konfiqurasiya edilməyib. " +
                "appsettings.json faylında \"OpenAI:ApiKey\" dəyərini təyin edin.");

        // ERP-nin cari vəziyyəti sistem promptuna daxil edilir (RAG-lite)
        var context = await BuildContextAsync(ct);

        var payload = new
        {
            model = _settings.Model,
            temperature = 0.3,
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content =
                        "Sən SmartERP adlı logistika şirkəti üçün ERP sisteminin AI köməkçisisən. " +
                        "Cavabları Azərbaycan dilində, konkret rəqəmlərlə və qısa ver. " +
                        "Maliyyə təhlili, stok tövsiyələri, qeyri-adi xərclərin aşkarlanması və " +
                        "biznes tövsiyələri verə bilərsən. Yalnız aşağıdakı məlumatlara əsaslan:\n\n" + context
                },
                new { role = "user", content = request.Question }
            }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
        {
            Content = JsonContent.Create(payload)
        };
        httpRequest.Headers.Authorization = new("Bearer", _settings.ApiKey);

        var response = await httpClient.SendAsync(httpRequest, ct);
        if (!response.IsSuccessStatusCode)
            throw new ConflictException($"AI xidməti cavab vermədi (HTTP {(int)response.StatusCode}). API açarını yoxlayın.");

        using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var answer = json.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "Cavab alına bilmədi.";

        return new AiAnswerDto(answer.Trim());
    }

    /// <summary>ERP-nin yığcam vəziyyət hesabatı (modelin kontekstinə sığacaq həcmdə).</summary>
    private async Task<string> BuildContextAsync(CancellationToken ct)
    {
        var sb = new StringBuilder();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var threeMonthsAgo = today.AddMonths(-3);

        // Maliyyə (son 3 ay, kateqoriya üzrə)
        var finance = await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Date >= threeMonthsAgo)
            .GroupBy(t => new { t.Type, t.Category.Name })
            .Select(g => new { g.Key.Type, g.Key.Name, Amount = g.Sum(t => t.Amount), Count = g.Count() })
            .ToListAsync(ct);

        sb.AppendLine($"## Maliyyə (son 3 ay, bu gün: {today})");
        foreach (var f in finance)
            sb.AppendLine($"- {(f.Type == TransactionType.Income ? "Gəlir" : "Xərc")} | {f.Name}: {f.Amount:0.##} AZN ({f.Count} əməliyyat)");

        // Ödənilməmiş fakturalar
        var unpaidInvoices = await unitOfWork.Repository<Invoice>().Query()
            .Where(i => i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.PartiallyPaid)
            .Select(i => new { i.Number, i.CustomerName, i.TotalAmount, Paid = i.Payments.Sum(p => p.Amount), i.DueDate })
            .ToListAsync(ct);

        sb.AppendLine($"## Ödənilməmiş fakturalar ({unpaidInvoices.Count} ədəd)");
        foreach (var i in unpaidInvoices.Take(10))
            sb.AppendLine($"- {i.Number} | {i.CustomerName} | qalıq {i.TotalAmount - i.Paid:0.##} AZN | son tarix {i.DueDate}");

        // Stok vəziyyəti
        var stock = await unitOfWork.Repository<Product>().Query()
            .Select(p => new
            {
                p.Name, p.Unit, p.MinStockLevel, p.SalePrice,
                Stock = p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .ToListAsync(ct);

        sb.AppendLine("## Anbar stoku");
        foreach (var p in stock.Take(30))
            sb.AppendLine($"- {p.Name}: {p.Stock:0.###} {p.Unit} (minimum: {p.MinStockLevel:0.###}){(p.Stock <= p.MinStockLevel ? " ⚠️AZ STOK" : "")}");

        // Satışlar
        var sales = await unitOfWork.Repository<SalesOrder>().Query()
            .OrderByDescending(o => o.Id).Take(15)
            .Select(o => new { o.Number, Customer = o.Customer.Name, o.TotalAmount, o.Status, o.OrderDate })
            .ToListAsync(ct);

        sb.AppendLine("## Son satış sifarişləri");
        foreach (var s in sales)
            sb.AppendLine($"- {s.Number} | {s.Customer} | {s.TotalAmount:0.##} AZN | {s.Status} | {s.OrderDate}");

        // Nəqliyyat
        var deliveryStats = await unitOfWork.Repository<Delivery>().Query()
            .GroupBy(d => d.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        sb.AppendLine("## Çatdırılmalar (status üzrə say)");
        foreach (var d in deliveryStats)
            sb.AppendLine($"- {d.Status}: {d.Count}");

        return sb.ToString();
    }
}
