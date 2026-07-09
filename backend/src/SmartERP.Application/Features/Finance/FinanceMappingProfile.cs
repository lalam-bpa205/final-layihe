using AutoMapper;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Entities.Finance;

namespace SmartERP.Application.Features.Finance;

public class FinanceMappingProfile : Profile
{
    public FinanceMappingProfile()
    {
        CreateMap<TransactionCategory, TransactionCategoryDto>()
            .ForMember(d => d.TransactionCount, o => o.MapFrom(s => s.Transactions.Count));

        CreateMap<FinanceTransaction, FinanceTransactionDto>()
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category.Name))
            .ForMember(d => d.InvoiceNumber, o => o.MapFrom(s => s.Invoice != null ? s.Invoice.Number : null));

        CreateMap<Budget, BudgetDto>()
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category.Name))
            .ForMember(d => d.SpentAmount, o => o.Ignore()); // ayrıca hesablanır

        CreateMap<InvoiceItem, InvoiceItemDto>();
        CreateMap<Payment, PaymentDto>();

        CreateMap<Invoice, InvoiceDto>()
            .ForMember(d => d.PaidAmount, o => o.MapFrom(s => s.Payments.Sum(p => p.Amount)));
    }
}
