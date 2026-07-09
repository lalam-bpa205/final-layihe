using FluentValidation;
using SmartERP.Application.Features.Transport.Dtos;

namespace SmartERP.Application.Features.Transport.Validators;

public class SaveVehicleRequestValidator : AbstractValidator<SaveVehicleRequest>
{
    public SaveVehicleRequestValidator()
    {
        RuleFor(x => x.PlateNumber).NotEmpty().WithMessage("Dövlət nömrəsi boş ola bilməz.").MaximumLength(20);
        RuleFor(x => x.Brand).NotEmpty().WithMessage("Marka boş ola bilməz.").MaximumLength(50);
        RuleFor(x => x.Model).NotEmpty().WithMessage("Model boş ola bilməz.").MaximumLength(50);
        RuleFor(x => x.Year).InclusiveBetween(1980, 2100).WithMessage("İl düzgün deyil.");
        RuleFor(x => x.Type).IsInEnum().WithMessage("Nəqliyyat növü yanlışdır.");
        RuleFor(x => x.CapacityKg).GreaterThanOrEqualTo(0).WithMessage("Tutum mənfi ola bilməz.");
    }
}

public class SaveDriverRequestValidator : AbstractValidator<SaveDriverRequest>
{
    public SaveDriverRequestValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0).WithMessage("İşçi seçilməlidir.");
        RuleFor(x => x.LicenseNumber).NotEmpty().WithMessage("Vəsiqə nömrəsi boş ola bilməz.").MaximumLength(30);
        RuleFor(x => x.LicenseCategories).NotEmpty().WithMessage("Kateqoriyalar boş ola bilməz.").MaximumLength(30);
        RuleFor(x => x.LicenseExpiryDate)
            .GreaterThan(DateOnly.FromDateTime(DateTime.Today))
            .WithMessage("Vəsiqənin etibarlılıq müddəti bitib.");
    }
}

public class SaveDeliveryRequestValidator : AbstractValidator<SaveDeliveryRequest>
{
    public SaveDeliveryRequestValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty().WithMessage("Müştəri adı boş ola bilməz.").MaximumLength(150);
        RuleFor(x => x.FromAddress).NotEmpty().WithMessage("Göndərmə ünvanı boş ola bilməz.").MaximumLength(300);
        RuleFor(x => x.ToAddress).NotEmpty().WithMessage("Çatdırılma ünvanı boş ola bilməz.").MaximumLength(300);
        RuleFor(x => x.VehicleId).GreaterThan(0).WithMessage("Avtomobil seçilməlidir.");
        RuleFor(x => x.DriverId).GreaterThan(0).WithMessage("Sürücü seçilməlidir.");
        RuleFor(x => x.CargoWeightKg).GreaterThan(0).When(x => x.CargoWeightKg is not null)
            .WithMessage("Yük çəkisi müsbət olmalıdır.");
        RuleFor(x => x.CargoDescription).MaximumLength(500);
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class SaveFuelRecordRequestValidator : AbstractValidator<SaveFuelRecordRequest>
{
    public SaveFuelRecordRequestValidator()
    {
        RuleFor(x => x.VehicleId).GreaterThan(0).WithMessage("Avtomobil seçilməlidir.");
        RuleFor(x => x.Liters).GreaterThan(0).WithMessage("Litr müsbət olmalıdır.");
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0).WithMessage("Məbləğ mənfi ola bilməz.");
        RuleFor(x => x.OdometerKm).GreaterThanOrEqualTo(0).When(x => x.OdometerKm is not null);
        RuleFor(x => x.Note).MaximumLength(300);
    }
}

public class SaveMaintenanceRecordRequestValidator : AbstractValidator<SaveMaintenanceRecordRequest>
{
    public SaveMaintenanceRecordRequestValidator()
    {
        RuleFor(x => x.VehicleId).GreaterThan(0).WithMessage("Avtomobil seçilməlidir.");
        RuleFor(x => x.Description).NotEmpty().WithMessage("Təsvir boş ola bilməz.").MaximumLength(500);
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0).WithMessage("Məbləğ mənfi ola bilməz.");
    }
}
