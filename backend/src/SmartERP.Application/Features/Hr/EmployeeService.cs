using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Entities.Auth;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Hr;

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeFilter filter, CancellationToken ct = default);
    Task<EmployeeDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<EmployeeDto> CreateAsync(SaveEmployeeRequest request, CancellationToken ct = default);
    Task<EmployeeDto> UpdateAsync(int id, SaveEmployeeRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<List<string>> GetModulesAsync(int id, CancellationToken ct = default);
    Task SetModulesAsync(int id, SetEmployeeModulesRequest request, CancellationToken ct = default);
}

public class EmployeeService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IPasswordHasher passwordHasher,
    IValidator<SaveEmployeeRequest> validator) : IEmployeeService
{
    public async Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Employee>().Query();

        // Axtarış: ad, soyad və ya email üzrə
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim();
            query = query.Where(e =>
                e.FirstName.Contains(s) || e.LastName.Contains(s) || e.Email.Contains(s));
        }

        if (filter.DepartmentId is not null)
            query = query.Where(e => e.DepartmentId == filter.DepartmentId);
        if (filter.PositionId is not null)
            query = query.Where(e => e.PositionId == filter.PositionId);

        // Sıralama
        query = (filter.SortBy?.ToLowerInvariant(), filter.SortDesc) switch
        {
            ("firstname", false) => query.OrderBy(e => e.FirstName),
            ("firstname", true) => query.OrderByDescending(e => e.FirstName),
            ("lastname", false) => query.OrderBy(e => e.LastName),
            ("lastname", true) => query.OrderByDescending(e => e.LastName),
            ("salary", false) => query.OrderBy(e => e.Salary),
            ("salary", true) => query.OrderByDescending(e => e.Salary),
            ("hiredate", false) => query.OrderBy(e => e.HireDate),
            ("hiredate", true) => query.OrderByDescending(e => e.HireDate),
            (_, true) => query.OrderByDescending(e => e.Id),
            _ => query.OrderBy(e => e.Id)
        };

        return await query
            .ProjectTo<EmployeeDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<EmployeeDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        await unitOfWork.Repository<Employee>().Query()
            .Where(e => e.Id == id)
            .ProjectTo<EmployeeDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("İşçi", id);

    public async Task<EmployeeDto> CreateAsync(SaveEmployeeRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsureValidAsync(request, id: null, ct);

        // İşçi + (opsional) user hesabı — bir tranzaksiyada.
        // User yaradılarkən xəta olsa (məs. username məşğuldur) işçi də yazılmır.
        var employee = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var newEmployee = new Employee
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Phone = request.Phone,
                BirthDate = request.BirthDate,
                HireDate = request.HireDate,
                Salary = request.Salary,
                DepartmentId = request.DepartmentId,
                PositionId = request.PositionId
            };

            if (request.CreateUserAccount)
            {
                var users = unitOfWork.Repository<User>();
                if (await users.AnyAsync(u => u.UserName == request.UserName || u.Email == request.Email, token))
                    throw new ConflictException("Bu istifadəçi adı və ya email ilə hesab artıq mövcuddur.");

                var employeeRole = await unitOfWork.Repository<Role>()
                    .FirstOrDefaultAsync(r => r.Name == RoleNames.Employee, token)
                    ?? throw new NotFoundException("Rol", RoleNames.Employee);

                newEmployee.User = new User
                {
                    UserName = request.UserName!,
                    Email = request.Email,
                    PasswordHash = passwordHasher.Hash(request.Password!),
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    UserRoles = { new UserRole { Role = employeeRole } }
                };

                // Seçilmiş modul icazələri
                foreach (var module in ParseModules(request.Modules))
                    newEmployee.User.ModuleAccesses.Add(new UserModuleAccess { Module = module });
            }

            await unitOfWork.Repository<Employee>().AddAsync(newEmployee, token);
            return newEmployee;
        }, ct);

        return await GetByIdAsync(employee.Id, ct);
    }

    public async Task<EmployeeDto> UpdateAsync(int id, SaveEmployeeRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var employee = await unitOfWork.Repository<Employee>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("İşçi", id);

        await EnsureValidAsync(request, id, ct);

        employee.FirstName = request.FirstName;
        employee.LastName = request.LastName;
        employee.Email = request.Email;
        employee.Phone = request.Phone;
        employee.BirthDate = request.BirthDate;
        employee.HireDate = request.HireDate;
        employee.Salary = request.Salary;
        employee.DepartmentId = request.DepartmentId;
        employee.PositionId = request.PositionId;

        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Employee>();
        var employee = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("İşçi", id);

        repo.Remove(employee);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<List<string>> GetModulesAsync(int id, CancellationToken ct = default)
    {
        var employee = await unitOfWork.Repository<Employee>().Query()
            .Include(e => e.User).ThenInclude(u => u!.ModuleAccesses)
            .FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new NotFoundException("İşçi", id);

        return employee.User?.ModuleAccesses
            .Select(ma => ma.Module.ToString())
            .Order()
            .ToList() ?? [];
    }

    public async Task SetModulesAsync(int id, SetEmployeeModulesRequest request, CancellationToken ct = default)
    {
        var employee = await unitOfWork.Repository<Employee>().Query()
            .Include(e => e.User).ThenInclude(u => u!.ModuleAccesses)
            .FirstOrDefaultAsync(e => e.Id == id, ct)
            ?? throw new NotFoundException("İşçi", id);

        if (employee.User is null)
            throw new ConflictException("Bu işçinin sistemə giriş hesabı yoxdur.");

        var desired = ParseModules(request.Modules).ToHashSet();
        var accessRepo = unitOfWork.Repository<UserModuleAccess>();

        // Silinməli olanlar
        foreach (var existing in employee.User.ModuleAccesses.Where(ma => !desired.Contains(ma.Module)).ToList())
            accessRepo.Remove(existing);

        // Əlavə olunmalı olanlar
        var current = employee.User.ModuleAccesses.Select(ma => ma.Module).ToHashSet();
        foreach (var module in desired.Except(current))
            await accessRepo.AddAsync(new UserModuleAccess { UserId = employee.User.Id, Module = module }, ct);

        await unitOfWork.SaveChangesAsync(ct);
    }

    private static List<AppModule> ParseModules(List<string>? modules)
    {
        if (modules is null || modules.Count == 0) return [];

        var result = new List<AppModule>();
        foreach (var name in modules.Distinct())
        {
            if (!Enum.TryParse<AppModule>(name, ignoreCase: true, out var module))
                throw new ConflictException($"'{name}' adlı modul mövcud deyil.");
            result.Add(module);
        }
        return result;
    }

    private async Task EnsureValidAsync(SaveEmployeeRequest request, int? id, CancellationToken ct)
    {
        if (await unitOfWork.Repository<Employee>()
                .AnyAsync(e => e.Email == request.Email && e.Id != id, ct))
            throw new ConflictException("Bu email ilə işçi artıq mövcuddur.");

        // Vəzifə seçilmiş şöbəyə aid olmalıdır
        var positionValid = await unitOfWork.Repository<Position>()
            .AnyAsync(p => p.Id == request.PositionId && p.DepartmentId == request.DepartmentId, ct);
        if (!positionValid)
            throw new ConflictException("Seçilmiş vəzifə bu şöbəyə aid deyil.");
    }
}
