using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;

namespace SmartERP.Application.Features.Hr;

public interface IWorkScheduleService
{
    Task<List<WorkScheduleDto>> GetAllAsync(CancellationToken ct = default);
    Task<WorkScheduleDto> CreateAsync(SaveWorkScheduleRequest request, CancellationToken ct = default);
    Task<WorkScheduleDto> UpdateAsync(int id, SaveWorkScheduleRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class WorkScheduleService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveWorkScheduleRequest> validator) : IWorkScheduleService
{
    public async Task<List<WorkScheduleDto>> GetAllAsync(CancellationToken ct = default) =>
        await unitOfWork.Repository<WorkSchedule>().Query()
            .OrderBy(w => w.Name)
            .ProjectTo<WorkScheduleDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

    public async Task<WorkScheduleDto> CreateAsync(SaveWorkScheduleRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<WorkSchedule>();
        if (await repo.AnyAsync(w => w.Name == request.Name, ct))
            throw new ConflictException("Bu adda iş qrafiki artıq mövcuddur.");

        var schedule = Map(new WorkSchedule(), request);
        await repo.AddAsync(schedule, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return await GetDtoAsync(schedule.Id, ct);
    }

    public async Task<WorkScheduleDto> UpdateAsync(int id, SaveWorkScheduleRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<WorkSchedule>();
        var schedule = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("İş qrafiki", id);

        if (await repo.AnyAsync(w => w.Name == request.Name && w.Id != id, ct))
            throw new ConflictException("Bu adda iş qrafiki artıq mövcuddur.");

        Map(schedule, request);
        await unitOfWork.SaveChangesAsync(ct);

        return await GetDtoAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<WorkSchedule>();
        var schedule = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("İş qrafiki", id);

        // İşçilər bağlıdırsa silmək əvəzinə əlaqəni kəsmək lazımdır — istifadəçini xəbərdar edirik
        if (await unitOfWork.Repository<Employee>().AnyAsync(e => e.WorkScheduleId == id, ct))
            throw new ConflictException("Bu qrafikdə işçilər var — əvvəlcə onları başqa qrafikə keçirin.");

        repo.Remove(schedule);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static WorkSchedule Map(WorkSchedule schedule, SaveWorkScheduleRequest r)
    {
        schedule.Name = r.Name;
        schedule.Monday = r.Monday;
        schedule.Tuesday = r.Tuesday;
        schedule.Wednesday = r.Wednesday;
        schedule.Thursday = r.Thursday;
        schedule.Friday = r.Friday;
        schedule.Saturday = r.Saturday;
        schedule.Sunday = r.Sunday;
        schedule.StartTime = r.StartTime;
        schedule.EndTime = r.EndTime;
        return schedule;
    }

    private async Task<WorkScheduleDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<WorkSchedule>().Query()
            .Where(w => w.Id == id)
            .ProjectTo<WorkScheduleDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
}
