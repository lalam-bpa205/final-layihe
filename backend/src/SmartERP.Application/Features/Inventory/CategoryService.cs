using MapsterMapper;
using Mapster;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;

namespace SmartERP.Application.Features.Inventory;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync(CancellationToken ct = default);
    Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default);
    Task<CategoryDto> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class CategoryService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveCategoryRequest> validator) : ICategoryService
{
    public async Task<List<CategoryDto>> GetAllAsync(CancellationToken ct = default) =>
        await unitOfWork.Repository<Category>().Query()
            .OrderBy(c => c.Name)
            .ProjectToType<CategoryDto>()
            .ToListAsync(ct);

    public async Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Category>();
        if (await repo.AnyAsync(c => c.Name == request.Name, ct))
            throw new ConflictException("Bu adda kateqoriya artıq mövcuddur.");

        var category = new Category { Name = request.Name, Description = request.Description };
        await repo.AddAsync(category, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<CategoryDto>(category);
    }

    public async Task<CategoryDto> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Category>();
        var category = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Kateqoriya", id);

        if (await repo.AnyAsync(c => c.Name == request.Name && c.Id != id, ct))
            throw new ConflictException("Bu adda kateqoriya artıq mövcuddur.");

        category.Name = request.Name;
        category.Description = request.Description;
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<CategoryDto>(category);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Category>();
        var category = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Kateqoriya", id);

        if (await unitOfWork.Repository<Product>().AnyAsync(p => p.CategoryId == id, ct))
            throw new ConflictException("Bu kateqoriyada məhsullar var — əvvəlcə onları köçürün.");

        repo.Remove(category);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
