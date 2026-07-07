using FluentValidation;
using SmartERP.Application.Features.Inventory.Dtos;

namespace SmartERP.Application.Features.Inventory.Validators;

public class SaveCategoryRequestValidator : AbstractValidator<SaveCategoryRequest>
{
    public SaveCategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Kateqoriya adı boş ola bilməz.").MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class SaveWarehouseRequestValidator : AbstractValidator<SaveWarehouseRequest>
{
    public SaveWarehouseRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Anbar adı boş ola bilməz.").MaximumLength(100);
        RuleFor(x => x.Location).MaximumLength(300);
    }
}

public class SaveProductRequestValidator : AbstractValidator<SaveProductRequest>
{
    public SaveProductRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Məhsul adı boş ola bilməz.").MaximumLength(200);
        RuleFor(x => x.Barcode).NotEmpty().WithMessage("Barkod boş ola bilməz.").MaximumLength(50);
        RuleFor(x => x.Unit).NotEmpty().WithMessage("Ölçü vahidi boş ola bilməz.").MaximumLength(20);
        RuleFor(x => x.PurchasePrice).GreaterThanOrEqualTo(0).WithMessage("Alış qiyməti mənfi ola bilməz.");
        RuleFor(x => x.SalePrice).GreaterThanOrEqualTo(0).WithMessage("Satış qiyməti mənfi ola bilməz.");
        RuleFor(x => x.MinStockLevel).GreaterThanOrEqualTo(0).WithMessage("Minimum stok mənfi ola bilməz.");
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Kateqoriya seçilməlidir.");
    }
}

public class StockInRequestValidator : AbstractValidator<StockInRequest>
{
    public StockInRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Miqdar müsbət olmalıdır.");
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0).When(x => x.UnitPrice is not null);
        RuleFor(x => x.Note).MaximumLength(300);
    }
}

public class StockOutRequestValidator : AbstractValidator<StockOutRequest>
{
    public StockOutRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.WarehouseId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Miqdar müsbət olmalıdır.");
        RuleFor(x => x.Note).MaximumLength(300);
    }
}

public class StockTransferRequestValidator : AbstractValidator<StockTransferRequest>
{
    public StockTransferRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.FromWarehouseId).GreaterThan(0);
        RuleFor(x => x.ToWarehouseId).GreaterThan(0);
        RuleFor(x => x)
            .Must(x => x.FromWarehouseId != x.ToWarehouseId)
            .WithMessage("Göndərən və qəbul edən anbar eyni ola bilməz.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Miqdar müsbət olmalıdır.");
        RuleFor(x => x.Note).MaximumLength(300);
    }
}
