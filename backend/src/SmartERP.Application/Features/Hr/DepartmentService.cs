using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;

namespace SmartERP.Application.Features.Hr;

public interface IDepartmentService
{
    Task<List<DepartmentDto>> GetAllAsync(CancellationToken ct = default);
    Task<DepartmentDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<DepartmentDto> CreateAsync(SaveDepartmentRequest request, CancellationToken ct = default);
    Task<DepartmentDto> UpdateAsync(int id, SaveDepartmentRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class DepartmentService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveDepartmentRequest> validator) : IDepartmentService
{
    public async Task<List<DepartmentDto>> GetAllAsync(CancellationToken ct = default) =>
        await unitOfWork.Repository<Department>().Query()
            .OrderBy(d => d.Name)
            .ProjectTo<DepartmentDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        await unitOfWork.Repository<Department>().Query()
            .Where(d => d.Id == id)
            .ProjectTo<DepartmentDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Şöbə", id);

    public async Task<DepartmentDto> CreateAsync(SaveDepartmentRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Department>();
        if (await repo.AnyAsync(d => d.Name == request.Name, ct))
            throw new ConflictException("Bu adda şöbə artıq mövcuddur.");

        var department = new Department { Name = request.Name, Description = request.Description };
        await repo.AddAsync(department, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<DepartmentDto>(department);
    }

    public async Task<DepartmentDto> UpdateAsync(int id, SaveDepartmentRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Department>();
        var department = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Şöbə", id);

        if (await repo.AnyAsync(d => d.Name == request.Name && d.Id != id, ct))
            throw new ConflictException("Bu adda şöbə artıq mövcuddur.");

        department.Name = request.Name;
        department.Description = request.Description;
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<DepartmentDto>(department);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Department>();
        var department = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Şöbə", id);

        if (await unitOfWork.Repository<Employee>().AnyAsync(e => e.DepartmentId == id, ct))
            throw new ConflictException("Bu şöbədə işçilər var — əvvəlcə onları köçürün.");

        repo.Remove(department);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
