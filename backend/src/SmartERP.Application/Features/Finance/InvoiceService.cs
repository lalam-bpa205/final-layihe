using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Finance;

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> GetPagedAsync(InvoiceFilter filter, CancellationToken ct = default);
    Task<InvoiceDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<InvoiceDto> CreateAsync(SaveInvoiceRequest request, CancellationToken ct = default);
    Task<InvoiceDto> AddPaymentAsync(int id, AddPaymentRequest request, CancellationToken ct = default);
    Task<InvoiceDto> CancelAsync(int id, CancellationToken ct = default);
}

public class InvoiceService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    INotificationService notifications,
    IValidator<SaveInvoiceRequest> invoiceValidator,
    IValidator<AddPaymentRequest> paymentValidator) : IInvoiceService
{
    private const string PaymentIncomeCategoryName = "Faktura ödənişləri";

    public async Task<PagedResult<InvoiceDto>> GetPagedAsync(InvoiceFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Invoice>().Query();

        if (filter.Status is not null)
            query = query.Where(i => i.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim();
            query = query.Where(i => i.Number.Contains(s) || i.CustomerName.Contains(s));
        }

        return await query
            .OrderByDescending(i => i.Id)
            .ProjectTo<InvoiceDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<InvoiceDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        await unitOfWork.Repository<Invoice>().Query()
            .Where(i => i.Id == id)
            .ProjectTo<InvoiceDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Faktura", id);

    public async Task<InvoiceDto> CreateAsync(SaveInvoiceRequest request, CancellationToken ct = default)
    {
        await invoiceValidator.ValidateAndThrowAsync(request, ct);

        var invoice = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var newInvoice = new Invoice
            {
                Number = "TMP",
                CustomerName = request.CustomerName,
                IssueDate = request.IssueDate,
                DueDate = request.DueDate,
                Note = request.Note,
                Items = request.Items.Select(i => new InvoiceItem
                {
                    Description = i.Description,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = Math.Round(i.Quantity * i.UnitPrice, 2)
                }).ToList()
            };
            newInvoice.TotalAmount = newInvoice.Items.Sum(i => i.LineTotal);

            await unitOfWork.Repository<Invoice>().AddAsync(newInvoice, token);
            await unitOfWork.SaveChangesAsync(token);

            newInvoice.Number = $"INV-{newInvoice.Id:D5}";
            return newInvoice;
        }, ct);

        return await GetByIdAsync(invoice.Id, ct);
    }

    /// <summary>
    /// Ödəniş qəbulu. Üç dəyişiklik BİR tranzaksiyada:
    /// 1) Payment yaradılır, 2) faktura statusu yenilənir,
    /// 3) gəlir əməliyyatı (FinanceTransaction) avtomatik yazılır.
    /// Hər hansı addım uğursuz olsa hamısı rollback olunur.
    /// </summary>
    public async Task<InvoiceDto> AddPaymentAsync(int id, AddPaymentRequest request, CancellationToken ct = default)
    {
        await paymentValidator.ValidateAndThrowAsync(request, ct);

        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var invoice = await unitOfWork.Repository<Invoice>().Query()
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id, token)
                ?? throw new NotFoundException("Faktura", id);

            if (invoice.Status == InvoiceStatus.Cancelled)
                throw new ConflictException("Ləğv edilmiş fakturaya ödəniş qəbul edilə bilməz.");
            if (invoice.Status == InvoiceStatus.Paid)
                throw new ConflictException("Bu faktura artıq tam ödənilib.");

            var paidSoFar = invoice.Payments.Sum(p => p.Amount);
            var remaining = invoice.TotalAmount - paidSoFar;
            if (request.Amount > remaining)
                throw new ConflictException(
                    $"Ödəniş qalıq borcdan çoxdur. Qalıq: {remaining:0.##} ₼.");

            // 1) Ödəniş
            invoice.Payments.Add(new Payment
            {
                Date = request.Date,
                Amount = request.Amount,
                Method = request.Method,
                Note = request.Note
            });

            // 2) Status
            var newPaid = paidSoFar + request.Amount;
            invoice.Status = newPaid >= invoice.TotalAmount
                ? InvoiceStatus.Paid
                : InvoiceStatus.PartiallyPaid;

            // 3) Gəlir əməliyyatı (kateqoriya yoxdursa yaradılır)
            var categoryRepo = unitOfWork.Repository<TransactionCategory>();
            var incomeCategory = await categoryRepo.FirstOrDefaultAsync(
                c => c.Name == PaymentIncomeCategoryName && c.Type == TransactionType.Income, token);

            if (incomeCategory is null)
            {
                incomeCategory = new TransactionCategory
                {
                    Name = PaymentIncomeCategoryName,
                    Type = TransactionType.Income
                };
                await categoryRepo.AddAsync(incomeCategory, token);
            }

            await unitOfWork.Repository<FinanceTransaction>().AddAsync(new FinanceTransaction
            {
                Type = TransactionType.Income,
                Category = incomeCategory,
                Date = request.Date,
                Amount = request.Amount,
                Method = request.Method,
                Description = $"{invoice.Number} nömrəli faktura üzrə ödəniş — {invoice.CustomerName}",
                Invoice = invoice
            }, token);
        }, ct);

        var dto = await GetByIdAsync(id, ct);

        await notifications.NotifyModuleAsync(
            AppModule.Finance,
            "💰 Ödəniş qəbul edildi",
            $"{dto.Number} — {request.Amount:0.##} ₼ ({dto.CustomerName}). " +
            (dto.Status == InvoiceStatus.Paid ? "Faktura tam ödənildi." : $"Qalıq: {dto.RemainingAmount:0.##} ₼."),
            "/finance/invoices", ct);

        return dto;
    }

    public async Task<InvoiceDto> CancelAsync(int id, CancellationToken ct = default)
    {
        var invoice = await unitOfWork.Repository<Invoice>().Query()
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new NotFoundException("Faktura", id);

        if (invoice.Payments.Count > 0)
            throw new ConflictException("Ödənişi olan faktura ləğv edilə bilməz.");
        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new ConflictException("Faktura artıq ləğv edilib.");

        invoice.Status = InvoiceStatus.Cancelled;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }
}
