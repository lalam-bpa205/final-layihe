using FluentValidation;

namespace SmartERP.Application.Features.Transport.Fuel;

public class SaveFuelSourceRequestValidator : AbstractValidator<SaveFuelSourceRequest>
{
    public SaveFuelSourceRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Mənbənin adı boş ola bilməz.").MaximumLength(120);
        RuleFor(x => x.Type).IsInEnum().WithMessage("Mənbə tipi düzgün deyil.");
        RuleFor(x => x.Address).MaximumLength(250);
        RuleFor(x => x.CapacityLiters).GreaterThan(0).WithMessage("Tutum müsbət olmalıdır.");
    }
}

public class ReplenishFuelSourceRequestValidator : AbstractValidator<ReplenishFuelSourceRequest>
{
    public ReplenishFuelSourceRequestValidator()
    {
        RuleFor(x => x.Liters).GreaterThan(0).WithMessage("Mədaxil olunan litr müsbət olmalıdır.");
        RuleFor(x => x.Note).MaximumLength(300);
    }
}

public class FuelTransferRequestValidator : AbstractValidator<FuelTransferRequest>
{
    public FuelTransferRequestValidator()
    {
        RuleFor(x => x.FuelSourceId).GreaterThan(0).WithMessage("Yanacaq mənbəyi seçilməlidir.");
        RuleFor(x => x.VehicleId).GreaterThan(0).WithMessage("Avtomobil seçilməlidir.");
        RuleFor(x => x.Liters).GreaterThan(0).WithMessage("Köçürülən litr müsbət olmalıdır.");
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0).WithMessage("Məbləğ mənfi ola bilməz.");
        RuleFor(x => x.OdometerKm).GreaterThanOrEqualTo(0).When(x => x.OdometerKm is not null);
        RuleFor(x => x.Note).MaximumLength(300);
    }
}
