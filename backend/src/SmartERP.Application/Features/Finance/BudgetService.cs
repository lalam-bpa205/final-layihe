using MapsterMapper;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Finance;

public interface IBudgetService
{
    Task<List<BudgetDto>> GetForMonthAsync(int year, int month, CancellationToken ct = default);
    Task<BudgetDto> SaveAsync(SaveBudgetRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class BudgetService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveBudgetRequest> validator) : IBudgetService
{
    public async Task<List<BudgetDto>> GetForMonthAsync(int year, int month, CancellationToken ct = default)
    {
        var budgets = await unitOfWork.Repository<Budget>().Query()
            .Include(b => b.Category)
            .Where(b => b.Year == year && b.Month == month)
            .OrderBy(b => b.Category.Name)
            .ToListAsync(ct);

        if (budgets.Count == 0) return [];

        // Ayın xərcləri kateqoriya üzrə bir sorğu ilə hesablanır
        var monthStart = new DateOnly(year, month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var categoryIds = budgets.Select(b => b.CategoryId).ToList();

        var spent = await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Type == TransactionType.Expense &&
                        categoryIds.Contains(t.CategoryId) &&
                        t.Date >= monthStart && t.Date <= monthEnd)
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key, Amount = g.Sum(t => t.Amount) })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Amount, ct);

        return budgets.Select(b =>
        {
            var dto = mapper.Map<BudgetDto>(b);
            dto.SpentAmount = spent.GetValueOrDefault(b.CategoryId);
            return dto;
        }).ToList();
    }

    public async Task<BudgetDto> SaveAsync(SaveBudgetRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var category = await unitOfWork.Repository<TransactionCategory>().GetByIdAsync(request.CategoryId, ct)
            ?? throw new NotFoundException("Kateqoriya", request.CategoryId);

        if (category.Type != TransactionType.Expense)
            throw new ConflictException("Büdcə yalnız xərc kateqoriyalarına təyin edilə bilər.");

        var repo = unitOfWork.Repository<Budget>();
        var existing = await repo.FirstOrDefaultAsync(
            b => b.Year == request.Year && b.Month == request.Month && b.CategoryId == request.CategoryId, ct);

        // Eyni ay+kateqoriya üçün mövcud büdcə yenilənir (upsert)
        if (existing is not null)
        {
            existing.LimitAmount = request.LimitAmount;
            await unitOfWork.SaveChangesAsync(ct);
        }
        else
        {
            existing = new Budget
            {
                Year = request.Year,
                Month = request.Month,
                CategoryId = request.CategoryId,
                LimitAmount = request.LimitAmount
            };
            await repo.AddAsync(existing, ct);
            await unitOfWork.SaveChangesAsync(ct);
        }

        var result = (await GetForMonthAsync(request.Year, request.Month, ct))
            .First(b => b.Id == existing.Id);
        return result;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Budget>();
        var budget = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Büdcə", id);

        repo.Remove(budget);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
