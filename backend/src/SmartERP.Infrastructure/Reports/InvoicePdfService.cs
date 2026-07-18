using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SmartERP.Application.Features.Finance;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Enums;

namespace SmartERP.Infrastructure.Reports;

/// <summary>
/// QuestPDF ilə çap-hazır A4 faktura sənədi yaradır.
/// Şrift Arial-dır — Azərbaycan hərflərini (Ə, ı, ş, ...) düzgün göstərir.
/// </summary>
public class InvoicePdfService : IInvoicePdfService
{
    private const string Brand = "#2a4d8f";
    private const string Muted = "#6b7280";
    private const string FontName = "Arial";

    public byte[] Generate(InvoiceDto invoice)
    {
        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(t => t.FontFamily(FontName).FontSize(10).FontColor("#1f2937"));

                page.Header().Element(c => Header(c, invoice));
                page.Content().PaddingVertical(20).Element(c => Body(c, invoice));
                page.Footer().Element(Footer);
            });
        }).GeneratePdf();
    }

    private static void Header(IContainer container, InvoiceDto invoice)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("SmartERP Logistika MMC").FontSize(18).Bold().FontColor(Brand);
                col.Item().Text("Bakı, Azərbaycan").FontColor(Muted);
                col.Item().Text("info@smarterp.az · +994 12 000 00 00").FontColor(Muted);
            });

            row.ConstantItem(200).Column(col =>
            {
                col.Item().AlignRight().Text("FAKTURA").FontSize(22).Bold().FontColor(Brand);
                col.Item().AlignRight().Text(invoice.Number).FontSize(12).SemiBold();
                col.Item().AlignRight().PaddingTop(4).Text(StatusText(invoice.Status))
                    .FontColor(StatusColor(invoice.Status)).SemiBold();
            });
        });
    }

    private static void Body(IContainer container, InvoiceDto invoice)
    {
        container.Column(col =>
        {
            col.Spacing(16);

            // Müştəri + tarixlər
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Müştəri").FontColor(Muted).FontSize(9);
                    c.Item().Text(invoice.CustomerName).FontSize(12).SemiBold();
                });
                row.ConstantItem(200).Column(c =>
                {
                    c.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Buraxılış tarixi:").FontColor(Muted);
                        r.AutoItem().Text(invoice.IssueDate.ToString("dd.MM.yyyy")).SemiBold();
                    });
                    c.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Son ödəniş tarixi:").FontColor(Muted);
                        r.AutoItem().Text(invoice.DueDate.ToString("dd.MM.yyyy")).SemiBold();
                    });
                });
            });

            // Sətirlər cədvəli
            col.Item().Element(c => ItemsTable(c, invoice));

            // Yekun məbləğlər
            col.Item().AlignRight().Width(240).Column(c =>
            {
                SummaryRow(c, "Ümumi məbləğ", invoice.TotalAmount, false);
                SummaryRow(c, "Ödənilib", invoice.PaidAmount, false);
                c.Item().PaddingVertical(4).LineHorizontal(1).LineColor("#d1d5db");
                SummaryRow(c, "Qalıq", invoice.RemainingAmount, true);
            });

            // Ödəniş tarixçəsi
            if (invoice.Payments.Count > 0)
                col.Item().Element(c => PaymentsTable(c, invoice));

            if (!string.IsNullOrWhiteSpace(invoice.Note))
                col.Item().PaddingTop(8).Column(c =>
                {
                    c.Item().Text("Qeyd").FontColor(Muted).FontSize(9);
                    c.Item().Text(invoice.Note!);
                });
        });
    }

    private static void ItemsTable(IContainer container, InvoiceDto invoice)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(5);   // təsvir
                c.RelativeColumn(2);   // miqdar
                c.RelativeColumn(2);   // vahid qiymət
                c.RelativeColumn(2);   // cəm
            });

            table.Header(h =>
            {
                HeaderCell(h, "Təsvir", Align.Left);
                HeaderCell(h, "Miqdar", Align.Right);
                HeaderCell(h, "Vahid qiymət", Align.Right);
                HeaderCell(h, "Cəm", Align.Right);
            });

            var i = 0;
            foreach (var item in invoice.Items)
            {
                var bg = i++ % 2 == 0 ? "#ffffff" : "#f3f4f6";
                BodyCell(table, item.Description, Align.Left, bg);
                BodyCell(table, Num(item.Quantity), Align.Right, bg);
                BodyCell(table, Money(item.UnitPrice), Align.Right, bg);
                BodyCell(table, Money(item.LineTotal), Align.Right, bg);
            }
        });
    }

    private static void PaymentsTable(IContainer container, InvoiceDto invoice)
    {
        container.Column(col =>
        {
            col.Item().PaddingBottom(6).Text("Ödəniş tarixçəsi").SemiBold().FontColor(Brand);
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(3);
                    c.RelativeColumn(3);
                    c.RelativeColumn(3);
                });
                table.Header(h =>
                {
                    HeaderCell(h, "Tarix", Align.Left);
                    HeaderCell(h, "Üsul", Align.Left);
                    HeaderCell(h, "Məbləğ", Align.Right);
                });
                foreach (var p in invoice.Payments)
                {
                    BodyCell(table, p.Date.ToString("dd.MM.yyyy"), Align.Left, "#ffffff");
                    BodyCell(table, MethodText(p.Method), Align.Left, "#ffffff");
                    BodyCell(table, Money(p.Amount), Align.Right, "#ffffff");
                }
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

    private enum Align { Left, Right }

    private static void HeaderCell(TableCellDescriptor h, string text, Align align)
    {
        var cell = h.Cell().Background(Brand).PaddingVertical(6).PaddingHorizontal(8);
        var t = cell.Text(text).FontColor("#ffffff").SemiBold().FontSize(9);
        if (align == Align.Right) t.AlignRight();
    }

    private static void BodyCell(TableDescriptor table, string text, Align align, string bg)
    {
        var cell = table.Cell().Background(bg).PaddingVertical(5).PaddingHorizontal(8);
        var t = cell.Text(text).FontSize(9);
        if (align == Align.Right) t.AlignRight();
    }

    private static void SummaryRow(ColumnDescriptor col, string label, decimal amount, bool bold)
    {
        col.Item().Row(row =>
        {
            var l = row.RelativeItem().Text(label);
            var v = row.AutoItem().Text(Money(amount));
            if (bold)
            {
                l.Bold().FontColor(Brand);
                v.Bold().FontColor(Brand);
            }
            else
            {
                l.FontColor(Muted);
            }
        });
    }

    private static string Money(decimal v) =>
        v.ToString("#,##0.00", System.Globalization.CultureInfo.InvariantCulture) + " ₼";

    private static string Num(decimal v) =>
        v.ToString("#,##0.##", System.Globalization.CultureInfo.InvariantCulture);

    private static string StatusText(InvoiceStatus s) => s switch
    {
        InvoiceStatus.Unpaid => "Ödənilməmiş",
        InvoiceStatus.PartiallyPaid => "Qismən ödənilmiş",
        InvoiceStatus.Paid => "Ödənilmiş",
        InvoiceStatus.Cancelled => "Ləğv edilmiş",
        _ => s.ToString()
    };

    private static string StatusColor(InvoiceStatus s) => s switch
    {
        InvoiceStatus.Paid => "#16a34a",
        InvoiceStatus.PartiallyPaid => "#d97706",
        InvoiceStatus.Cancelled => "#dc2626",
        _ => "#dc2626"
    };

    private static string MethodText(PaymentMethod m) => m switch
    {
        PaymentMethod.Cash => "Nağd",
        PaymentMethod.Card => "Kart",
        PaymentMethod.BankTransfer => "Bank köçürməsi",
        _ => m.ToString()
    };
}
