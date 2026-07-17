using MapsterMapper;
using Mapster;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Finance;

public interface ITransactionCategoryService
{
    Task<List<TransactionCategoryDto>> GetAllAsync(TransactionType? type = null, CancellationToken ct = default);
    Task<TransactionCategoryDto> CreateAsync(SaveTransactionCategoryRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class TransactionCategoryService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveTransactionCategoryRequest> validator) : ITransactionCategoryService
{
    public async Task<List<TransactionCategoryDto>> GetAllAsync(TransactionType? type = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<TransactionCategory>().Query();
        if (type is not null)
            query = query.Where(c => c.Type == type);

        return await query
            .OrderBy(c => c.Type).ThenBy(c => c.Name)
            .ProjectToType<TransactionCategoryDto>()
            .ToListAsync(ct);
    }

    public async Task<TransactionCategoryDto> CreateAsync(SaveTransactionCategoryRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<TransactionCategory>();
        if (await repo.AnyAsync(c => c.Name == request.Name && c.Type == request.Type, ct))
            throw new ConflictException("Bu adda kateqoriya artıq mövcuddur.");

        var category = new TransactionCategory { Name = request.Name, Type = request.Type };
        await repo.AddAsync(category, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<TransactionCategoryDto>(category);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<TransactionCategory>();
        var category = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Kateqoriya", id);

        if (await unitOfWork.Repository<FinanceTransaction>().AnyAsync(t => t.CategoryId == id, ct))
            throw new ConflictException("Bu kateqoriyada əməliyyatlar var — silmək mümkün deyil.");

        repo.Remove(category);
        await unitOfWork.SaveChangesAsync(ct);
    }
}

public interface IFinanceTransactionService
{
    Task<PagedResult<FinanceTransactionDto>> GetPagedAsync(FinanceTransactionFilter filter, CancellationToken ct = default);
    Task<FinanceTransactionDto> CreateAsync(SaveFinanceTransactionRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<FinanceSummaryDto> GetSummaryAsync(DateOnly? from = null, DateOnly? to = null, CancellationToken ct = default);
}

public class FinanceTransactionService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveFinanceTransactionRequest> validator) : IFinanceTransactionService
{
    public async Task<PagedResult<FinanceTransactionDto>> GetPagedAsync(FinanceTransactionFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<FinanceTransaction>().Query();

        if (filter.Type is not null)
            query = query.Where(t => t.Type == filter.Type);
        if (filter.CategoryId is not null)
            query = query.Where(t => t.CategoryId == filter.CategoryId);
        if (filter.From is not null)
            query = query.Where(t => t.Date >= filter.From);
        if (filter.To is not null)
            query = query.Where(t => t.Date <= filter.To);

        return await query
            .OrderByDescending(t => t.Date).ThenByDescending(t => t.Id)
            .ProjectToType<FinanceTransactionDto>()
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<FinanceTransactionDto> CreateAsync(SaveFinanceTransactionRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var category = await unitOfWork.Repository<TransactionCategory>().GetByIdAsync(request.CategoryId, ct)
            ?? throw new NotFoundException("Kateqoriya", request.CategoryId);

        // Gəlir əməliyyatı yalnız gəlir kateqoriyasına yazıla bilər (və əksinə)
        if (category.Type != request.Type)
            throw new ConflictException("Kateqoriyanın tipi əməliyyatın tipi ilə uyğun deyil.");

        var transaction = new FinanceTransaction
        {
            Type = request.Type,
            CategoryId = request.CategoryId,
            Date = request.Date,
            Amount = request.Amount,
            Method = request.Method,
            Description = request.Description
        };

        await unitOfWork.Repository<FinanceTransaction>().AddAsync(transaction, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Id == transaction.Id)
            .ProjectToType<FinanceTransactionDto>()
            .FirstAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<FinanceTransaction>();
        var transaction = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Əməliyyat", id);

        if (transaction.InvoiceId is not null)
            throw new ConflictException("Faktura ödənişindən yaranan əməliyyat silinə bilməz.");

        repo.Remove(transaction);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<FinanceSummaryDto> GetSummaryAsync(DateOnly? from = null, DateOnly? to = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<FinanceTransaction>().Query();
        if (from is not null) query = query.Where(t => t.Date >= from);
        if (to is not null) query = query.Where(t => t.Date <= to);

        var byCategory = await query
            .GroupBy(t => new { t.Type, t.Category.Name })
            .Select(g => new { g.Key.Type, g.Key.Name, Amount = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        return new FinanceSummaryDto
        {
            TotalIncome = byCategory.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount),
            TotalExpense = byCategory.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount),
            IncomeByCategory = byCategory
                .Where(x => x.Type == TransactionType.Income)
                .OrderByDescending(x => x.Amount)
                .Select(x => new CategorySummaryDto { CategoryName = x.Name, Amount = x.Amount })
                .ToList(),
            ExpenseByCategory = byCategory
                .Where(x => x.Type == TransactionType.Expense)
                .OrderByDescending(x => x.Amount)
                .Select(x => new CategorySummaryDto { CategoryName = x.Name, Amount = x.Amount })
                .ToList()
        };
    }
}
