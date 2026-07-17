using Mapster;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Entities.Finance;

namespace SmartERP.Application.Features.Finance;

public class FinanceMappingRegister : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<TransactionCategory, TransactionCategoryDto>()
            .Map(d => d.TransactionCount, s => s.Transactions.Count);

        config.NewConfig<FinanceTransaction, FinanceTransactionDto>()
            .Map(d => d.CategoryName, s => s.Category.Name)
            .Map(d => d.InvoiceNumber, s => s.Invoice != null ? s.Invoice.Number : null);

        config.NewConfig<Budget, BudgetDto>()
            .Map(d => d.CategoryName, s => s.Category.Name)
            .Ignore(d => d.SpentAmount); // ayrıca hesablanır

        config.NewConfig<InvoiceItem, InvoiceItemDto>();
        config.NewConfig<Payment, PaymentDto>();

        config.NewConfig<Invoice, InvoiceDto>()
            .Map(d => d.PaidAmount, s => s.Payments.Sum(p => p.Amount));
    }
}
