using FluentValidation;
using SmartERP.Application.Features.Finance.Dtos;

namespace SmartERP.Application.Features.Finance.Validators;

public class SaveTransactionCategoryRequestValidator : AbstractValidator<SaveTransactionCategoryRequest>
{
    public SaveTransactionCategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Kateqoriya adı boş ola bilməz.").MaximumLength(100);
        RuleFor(x => x.Type).IsInEnum().WithMessage("Kateqoriya tipi yanlışdır.");
    }
}

public class SaveFinanceTransactionRequestValidator : AbstractValidator<SaveFinanceTransactionRequest>
{
    public SaveFinanceTransactionRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum().WithMessage("Əməliyyat tipi yanlışdır.");
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Kateqoriya seçilməlidir.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Məbləğ müsbət olmalıdır.");
        RuleFor(x => x.Method).IsInEnum().WithMessage("Ödəniş üsulu yanlışdır.");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class SaveBudgetRequestValidator : AbstractValidator<SaveBudgetRequest>
{
    public SaveBudgetRequestValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2000, 2100).WithMessage("İl düzgün deyil.");
        RuleFor(x => x.Month).InclusiveBetween(1, 12).WithMessage("Ay 1-12 aralığında olmalıdır.");
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Kateqoriya seçilməlidir.");
        RuleFor(x => x.LimitAmount).GreaterThan(0).WithMessage("Büdcə limiti müsbət olmalıdır.");
    }
}

public class SaveInvoiceRequestValidator : AbstractValidator<SaveInvoiceRequest>
{
    public SaveInvoiceRequestValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty().WithMessage("Müştəri adı boş ola bilməz.").MaximumLength(150);
        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.IssueDate)
            .WithMessage("Son ödəniş tarixi buraxılış tarixindən əvvəl ola bilməz.");
        RuleFor(x => x.Note).MaximumLength(500);

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Fakturada ən azı bir sətir olmalıdır.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Description).NotEmpty().WithMessage("Sətir təsviri boş ola bilməz.").MaximumLength(300);
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Miqdar müsbət olmalıdır.");
            item.RuleFor(i => i.UnitPrice).GreaterThanOrEqualTo(0).WithMessage("Qiymət mənfi ola bilməz.");
        });
    }
}

public class AddPaymentRequestValidator : AbstractValidator<AddPaymentRequest>
{
    public AddPaymentRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Ödəniş məbləği müsbət olmalıdır.");
        RuleFor(x => x.Method).IsInEnum().WithMessage("Ödəniş üsulu yanlışdır.");
        RuleFor(x => x.Note).MaximumLength(300);
    }
}
