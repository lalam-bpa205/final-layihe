using FluentValidation;
using SmartERP.Application.Features.Auth.Dtos;

namespace SmartERP.Application.Features.Auth.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("İstifadəçi adı boş ola bilməz.")
            .Length(3, 50).WithMessage("İstifadəçi adı 3-50 simvol olmalıdır.")
            .Matches("^[a-zA-Z0-9._-]+$").WithMessage("İstifadəçi adı yalnız hərf, rəqəm və . _ - simvollarından ibarət ola bilər.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email boş ola bilməz.")
            .EmailAddress().WithMessage("Email formatı yanlışdır.")
            .MaximumLength(100);

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifrə boş ola bilməz.")
            .MinimumLength(8).WithMessage("Şifrə ən azı 8 simvol olmalıdır.")
            .Matches("[A-Z]").WithMessage("Şifrədə ən azı bir böyük hərf olmalıdır.")
            .Matches("[a-z]").WithMessage("Şifrədə ən azı bir kiçik hərf olmalıdır.")
            .Matches("[0-9]").WithMessage("Şifrədə ən azı bir rəqəm olmalıdır.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad boş ola bilməz.")
            .MaximumLength(50);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Soyad boş ola bilməz.")
            .MaximumLength(50);
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.UserNameOrEmail).NotEmpty().WithMessage("İstifadəçi adı və ya email boş ola bilməz.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Şifrə boş ola bilməz.");
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Hazırkı şifrə boş ola bilməz.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Yeni şifrə boş ola bilməz.")
            .MinimumLength(8).WithMessage("Şifrə ən azı 8 simvol olmalıdır.")
            .Matches("[A-Z]").WithMessage("Şifrədə ən azı bir böyük hərf olmalıdır.")
            .Matches("[a-z]").WithMessage("Şifrədə ən azı bir kiçik hərf olmalıdır.")
            .Matches("[0-9]").WithMessage("Şifrədə ən azı bir rəqəm olmalıdır.")
            .NotEqual(x => x.CurrentPassword).WithMessage("Yeni şifrə köhnə şifrə ilə eyni ola bilməz.");
    }
}
