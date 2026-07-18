using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SmartERP.Application.Features.Dashboard;

namespace SmartERP.Infrastructure.Reports;

/// <summary>
/// İdarəetmə panelinin göstəricilərini bir səhifəlik A4 PDF hesabata çevirir.
/// Şrift Arial-dır — Azərbaycan hərfləri düzgün göstərilir.
/// </summary>
public class DashboardPdfService : IDashboardPdfService
{
    private const string Brand = "#2a4d8f";
    private const string Muted = "#6b7280";
    private const string Green = "#16a34a";
    private const string Red = "#dc2626";
    private const string FontName = "Arial";

    private static readonly string[] MonthShort =
        ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];

    public byte[] Generate(DashboardDto d, string generatedBy)
    {
        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(t => t.FontFamily(FontName).FontSize(10).FontColor("#1f2937"));

                page.Header().Element(c => Header(c, generatedBy));
                page.Content().PaddingVertical(16).Element(c => Body(c, d));
                page.Footer().Element(Footer);
            });
        }).GeneratePdf();
    }

    private static void Header(IContainer container, string generatedBy)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("SmartERP Logistika MMC").FontSize(16).Bold().FontColor(Brand);
                col.Item().Text("İdarəetmə Hesabatı").FontColor(Muted);
            });
            row.ConstantItem(220).Column(col =>
            {
                col.Item().AlignRight().Text($"Tarix: {DateTime.Now:dd.MM.yyyy HH:mm}").FontColor(Muted).FontSize(9);
                col.Item().AlignRight().Text($"Hazırladı: {generatedBy}").FontColor(Muted).FontSize(9);
            });
        });
    }

    private static void Body(IContainer container, DashboardDto d)
    {
        container.Column(col =>
        {
            col.Spacing(16);

            // Maliyyə KPI-ları
            var profit = d.MonthIncome - d.MonthExpense;
            col.Item().Row(row =>
            {
                row.Spacing(10);
                Kpi(row, "Bu ay gəlir", Money(d.MonthIncome), Green);
                Kpi(row, "Bu ay xərc", Money(d.MonthExpense), Red);
                Kpi(row, "Bu ay mənfəət", Money(profit), profit >= 0 ? Green : Red);
                Kpi(row, "Anbar dəyəri", Money(d.TotalStockValue), Brand);
            });

            // Xəbərdarlıqlar
            var alerts = new List<(string, int)>
            {
                ("Vaxtı keçmiş faktura", d.OverdueInvoiceCount),
                ("Az stoklu məhsul", d.LowStockCount),
                ("Gözləyən məzuniyyət", d.PendingLeaveCount),
                ("Gözləyən sifariş", d.PendingOrdersCount),
                ("Texniki xidmət", d.MaintenanceDueCount),
            }.Where(a => a.Item2 > 0).ToList();

            if (alerts.Count > 0)
                col.Item().Background("#fef2f2").Border(1).BorderColor("#fecaca").Padding(10).Column(c =>
                {
                    c.Item().Text("Diqqət tələb edən").SemiBold().FontColor(Red);
                    c.Item().PaddingTop(4).Row(row =>
                    {
                        foreach (var (label, count) in alerts)
                            row.RelativeItem().Text($"{label}: {count}").FontSize(9);
                    });
                });

            // Aylıq pul axını cədvəli
            col.Item().Column(c =>
            {
                c.Item().PaddingBottom(6).Text("Aylıq pul axını (son 6 ay)").SemiBold().FontColor(Brand);
                c.Item().Table(table =>
                {
                    table.ColumnsDefinition(cd =>
                    {
                        cd.RelativeColumn(2);
                        cd.RelativeColumn(3);
                        cd.RelativeColumn(3);
                        cd.RelativeColumn(3);
                    });
                    table.Header(h =>
                    {
                        Hc(h, "Ay", false);
                        Hc(h, "Gəlir", true);
                        Hc(h, "Xərc", true);
                        Hc(h, "Mənfəət", true);
                    });
                    var i = 0;
                    foreach (var m in d.MonthlyFinance)
                    {
                        var bg = i++ % 2 == 0 ? "#ffffff" : "#f3f4f6";
                        var p = m.Income - m.Expense;
                        Bc(table, FmtMonth(m.Month), false, bg, null);
                        Bc(table, Money(m.Income), true, bg, null);
                        Bc(table, Money(m.Expense), true, bg, null);
                        Bc(table, Money(p), true, bg, p >= 0 ? Green : Red);
                    }
                });
            });

            // İki sütun: xərc kateqoriyaları + əməliyyat göstəriciləri
            col.Item().Row(row =>
            {
                row.Spacing(16);

                row.RelativeItem().Column(c =>
                {
                    c.Item().PaddingBottom(6).Text("Bu ayın xərc kateqoriyaları").SemiBold().FontColor(Brand);
                    if (d.ExpenseByCategory.Count == 0)
                        c.Item().Text("Məlumat yoxdur").FontColor(Muted).FontSize(9);
                    foreach (var cat in d.ExpenseByCategory.Take(6))
                        c.Item().PaddingVertical(2).Row(r =>
                        {
                            r.RelativeItem().Text(cat.Name).FontSize(9);
                            r.AutoItem().Text(Money(cat.Amount)).FontSize(9).SemiBold();
                        });
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().PaddingBottom(6).Text("Əməliyyat göstəriciləri").SemiBold().FontColor(Brand);
                    Stat(c, "İşçilər", d.EmployeeCount);
                    Stat(c, "Müştərilər", d.CustomerCount);
                    Stat(c, "Təchizatçılar", d.SupplierCount);
                    Stat(c, "Məhsullar", d.ProductCount);
                    Stat(c, "Avtomobillər", d.VehicleCount);
                    Stat(c, "Aktiv çatdırılmalar", d.ActiveDeliveryCount);
                });
            });
        });
    }

    private static void Footer(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor("#d1d5db");
            col.Item().Row(row =>
            {
                row.RelativeItem().Text("SmartERP — Logistika İdarəetmə Sistemi").FontColor(Muted).FontSize(8);
                row.AutoItem().Text(t =>
                {
                    t.Span("Səhifə ").FontColor(Muted).FontSize(8);
                    t.CurrentPageNumber().FontColor(Muted).FontSize(8);
                    t.Span(" / ").FontColor(Muted).FontSize(8);
                    t.TotalPages().FontColor(Muted).FontSize(8);
                });
            });
        });
    }

    // ---------- Köməkçilər ----------

    private static void Kpi(RowDescriptor row, string label, string value, string color)
    {
        row.RelativeItem().Background("#f9fafb").Border(1).BorderColor("#e5e7eb").Padding(10).Column(c =>
        {
            c.Item().Text(value).FontSize(13).Bold().FontColor(color);
            c.Item().Text(label).FontSize(8).FontColor(Muted);
        });
    }

    private static void Stat(ColumnDescriptor col, string label, int value)
    {
        col.Item().PaddingVertical(2).Row(r =>
        {
            r.RelativeItem().Text(label).FontSize(9);
            r.AutoItem().Text(value.ToString()).FontSize(9).SemiBold();
        });
    }

    private static void Hc(TableCellDescriptor h, string text, bool right)
    {
        var cell = h.Cell().Background(Brand).PaddingVertical(5).PaddingHorizontal(8);
        var t = cell.Text(text).FontColor("#ffffff").SemiBold().FontSize(9);
        if (right) t.AlignRight();
    }

    private static void Bc(TableDescriptor table, string text, bool right, string bg, string? color)
    {
        var cell = table.Cell().Background(bg).PaddingVertical(4).PaddingHorizontal(8);
        var t = cell.Text(text).FontSize(9);
        if (color != null) t.FontColor(color).SemiBold();
        if (right) t.AlignRight();
    }

    private static string Money(decimal v) =>
        v.ToString("#,##0.00", System.Globalization.CultureInfo.InvariantCulture) + " ₼";

    private static string FmtMonth(string ym)
    {
        var parts = ym.Split('-');
        if (parts.Length == 2 && int.TryParse(parts[0], out var y) && int.TryParse(parts[1], out var m) && m is >= 1 and <= 12)
            return $"{MonthShort[m - 1]} {y % 100:D2}";
        return ym;
    }
}
