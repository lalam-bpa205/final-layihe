using MapsterMapper;
using Mapster;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;

namespace SmartERP.Application.Features.Hr;

public interface IPositionService
{
    Task<List<PositionDto>> GetAllAsync(int? departmentId = null, CancellationToken ct = default);
    Task<PositionDto> CreateAsync(SavePositionRequest request, CancellationToken ct = default);
    Task<PositionDto> UpdateAsync(int id, SavePositionRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class PositionService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SavePositionRequest> validator) : IPositionService
{
    public async Task<List<PositionDto>> GetAllAsync(int? departmentId = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Position>().Query();
        if (departmentId is not null)
            query = query.Where(p => p.DepartmentId == departmentId);

        return await query
            .OrderBy(p => p.Department.Name).ThenBy(p => p.Title)
            .ProjectToType<PositionDto>()
            .ToListAsync(ct);
    }

    public async Task<PositionDto> CreateAsync(SavePositionRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsureValidAsync(request, id: null, ct);

        var position = new Position
        {
            Title = request.Title,
            Description = request.Description,
            DepartmentId = request.DepartmentId
        };
        await unitOfWork.Repository<Position>().AddAsync(position, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return await GetDtoAsync(position.Id, ct);
    }

    public async Task<PositionDto> UpdateAsync(int id, SavePositionRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var position = await unitOfWork.Repository<Position>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Vəzifə", id);

        await EnsureValidAsync(request, id, ct);

        position.Title = request.Title;
        position.Description = request.Description;
        position.DepartmentId = request.DepartmentId;
        await unitOfWork.SaveChangesAsync(ct);

        return await GetDtoAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Position>();
        var position = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Vəzifə", id);

        if (await unitOfWork.Repository<Employee>().AnyAsync(e => e.PositionId == id, ct))
            throw new ConflictException("Bu vəzifədə işçilər var — əvvəlcə onları köçürün.");

        repo.Remove(position);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task EnsureValidAsync(SavePositionRequest request, int? id, CancellationToken ct)
    {
        if (!await unitOfWork.Repository<Department>().AnyAsync(d => d.Id == request.DepartmentId, ct))
            throw new NotFoundException("Şöbə", request.DepartmentId);

        var duplicate = await unitOfWork.Repository<Position>().AnyAsync(
            p => p.DepartmentId == request.DepartmentId && p.Title == request.Title && p.Id != id, ct);
        if (duplicate)
            throw new ConflictException("Bu şöbədə eyni adlı vəzifə artıq var.");
    }

    private async Task<PositionDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<Position>().Query()
            .Where(p => p.Id == id)
            .ProjectToType<PositionDto>()
            .FirstAsync(ct);
}
