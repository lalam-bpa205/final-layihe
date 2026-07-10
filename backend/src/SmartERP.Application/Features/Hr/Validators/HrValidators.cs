using FluentValidation;
using SmartERP.Application.Features.Hr.Dtos;

namespace SmartERP.Application.Features.Hr.Validators;

public class SaveDepartmentRequestValidator : AbstractValidator<SaveDepartmentRequest>
{
    public SaveDepartmentRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Şöbə adı boş ola bilməz.")
            .MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class SavePositionRequestValidator : AbstractValidator<SavePositionRequest>
{
    public SavePositionRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Vəzifə adı boş ola bilməz.")
            .MaximumLength(100);
        RuleFor(x => x.DepartmentId).GreaterThan(0).WithMessage("Şöbə seçilməlidir.");
    }
}

public class SaveEmployeeRequestValidator : AbstractValidator<SaveEmployeeRequest>
{
    public SaveEmployeeRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().WithMessage("Ad boş ola bilməz.").MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().WithMessage("Soyad boş ola bilməz.").MaximumLength(50);
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email boş ola bilməz.")
            .EmailAddress().WithMessage("Email formatı yanlışdır.");
        RuleFor(x => x.Phone).MaximumLength(20);
        RuleFor(x => x.Salary).GreaterThanOrEqualTo(0).WithMessage("Maaş mənfi ola bilməz.");
        RuleFor(x => x.DepartmentId).GreaterThan(0).WithMessage("Şöbə seçilməlidir.");
        RuleFor(x => x.PositionId).GreaterThan(0).WithMessage("Vəzifə seçilməlidir.");
        RuleFor(x => x.HireDate)
            .LessThanOrEqualTo(_ => DateOnly.FromDateTime(DateTime.Today).AddDays(30))
            .WithMessage("İşə qəbul tarixi düzgün deyil.");
        RuleFor(x => x.Address).MaximumLength(300).WithMessage("Ünvan 300 simvoldan çox ola bilməz.");
        RuleFor(x => x.EmergencyContact).MaximumLength(100).WithMessage("Təcili əlaqə 100 simvoldan çox ola bilməz.");
        RuleFor(x => x.Notes).MaximumLength(500).WithMessage("Qeydlər 500 simvoldan çox ola bilməz.");

        When(x => x.CreateUserAccount, () =>
        {
            RuleFor(x => x.UserName)
                .NotEmpty().WithMessage("Hesab yaradılırsa istifadəçi adı mütləqdir.")
                .Length(3, 50);
            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Hesab yaradılırsa şifrə mütləqdir.")
                .MinimumLength(8).WithMessage("Şifrə ən azı 8 simvol olmalıdır.");
        });
    }
}

public class CreateLeaveRequestValidator : AbstractValidator<CreateLeaveRequest>
{
    public CreateLeaveRequestValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.Type).IsInEnum().WithMessage("Məzuniyyət növü yanlışdır.");
        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("Bitmə tarixi başlama tarixindən əvvəl ola bilməz.");
        RuleFor(x => x)
            .Must(x => x.EndDate.DayNumber - x.StartDate.DayNumber <= 90)
            .WithMessage("Məzuniyyət 90 gündən çox ola bilməz.");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}
