using FluentValidation;
using SmartERP.Application.Features.Sales.Dtos;

namespace SmartERP.Application.Features.Sales.Validators;

public class SavePartnerRequestValidator : AbstractValidator<SavePartnerRequest>
{
    public SavePartnerRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Ad boş ola bilməz.").MaximumLength(150);
        RuleFor(x => x.ContactName).MaximumLength(100);
        RuleFor(x => x.Phone).MaximumLength(20);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email))
            .WithMessage("Email formatı yanlışdır.").MaximumLength(100);
        RuleFor(x => x.Address).MaximumLength(300);
    }
}

public class SaveOrderRequestValidator : AbstractValidator<SaveOrderRequest>
{
    public SaveOrderRequestValidator()
    {
        RuleFor(x => x.PartnerId).GreaterThan(0).WithMessage("Tərəf müqabil seçilməlidir.");
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithMessage("Anbar seçilməlidir.");
        RuleFor(x => x.Note).MaximumLength(500);

        RuleFor(x => x.Items).NotEmpty().WithMessage("Sifarişdə ən azı bir məhsul olmalıdır.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("Məhsul seçilməlidir.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Miqdar müsbət olmalıdır.");
            item.RuleFor(i => i.UnitPrice).GreaterThanOrEqualTo(0).WithMessage("Qiymət mənfi ola bilməz.");
        });

        RuleFor(x => x)
            .Must(x => x.Items.Select(i => i.ProductId).Distinct().Count() == x.Items.Count)
            .WithMessage("Eyni məhsul sifarişdə iki dəfə ola bilməz.");
    }
}
