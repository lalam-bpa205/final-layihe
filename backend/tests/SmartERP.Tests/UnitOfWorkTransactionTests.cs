using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Domain.Entities.Inventory;

namespace SmartERP.Tests;

/// <summary>
/// UnitOfWork tranzaksiya davranışı.
///
/// QEYD: Repository.AddAsync yalnız ChangeTracker-a yazır — DB-yə düşmür.
/// Ona görə servis testlərində rollback çox vaxt tracker təmizlənməsi ilə
/// təmin olunur. Burada isə dəyişiklik SaveChanges ilə REAL DB-yə yazılır və
/// sonra xəta atılır: yəni məhz DB tranzaksiyasının geri qayıtması yoxlanılır.
/// (Bu, SQLite in-memory-nin real tranzaksiya dəstəyi olduğu üçün mümkündür.)
/// </summary>
public class UnitOfWorkTransactionTests : IDisposable
{
    private readonly TestHarness _h = new();

    [Fact]
    public async Task DB_ye_yazildiqdan_sonra_xeta_olsa_deyisiklik_geri_qayidir()
    {
        var act = async () => await _h.UnitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Yazıldı" }, ct);
            await _h.UnitOfWork.SaveChangesAsync(ct); // ← real INSERT DB-yə gedir
            throw new ConflictException("sonradan xəta");
        });

        await act.Should().ThrowAsync<ConflictException>();

        // ChangeTracker-dan yox, birbaşa bazadan oxuyuruq
        var count = await _h.Db.Categories.AsNoTracking().CountAsync();
        count.Should().Be(0, "SaveChanges edilmiş INSERT də rollback olunmalıdır");
    }

    [Fact]
    public async Task Ugurlu_tranzaksiya_deyisikliyi_saxlayir()
    {
        await _h.UnitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Qalır" }, ct);
        });

        (await _h.Db.Categories.AsNoTracking().CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Rollbackdan_sonra_ChangeTracker_temizlenir()
    {
        var act = async () => await _h.UnitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Kirli" }, ct);
            throw new ConflictException("xəta");
        });
        await act.Should().ThrowAsync<ConflictException>();

        _h.Db.ChangeTracker.Entries().Should().BeEmpty(
            "əks halda növbəti SaveChanges rollback olunmuş sətri təkrar yazardı");

        // Növbəti əməliyyat təmiz vəziyyətdən başlamalıdır
        await _h.UnitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Təmiz" }, ct);
        });

        var names = await _h.Db.Categories.AsNoTracking().Select(c => c.Name).ToListAsync();
        names.Should().BeEquivalentTo(["Təmiz"], "'Kirli' təkrar yazılmamalıdır");
    }

    [Fact]
    public async Task Ic_ice_cagirish_movcud_tranzaksiyaya_qosulur_ve_birlikde_rollback_olunur()
    {
        var act = async () => await _h.UnitOfWork.ExecuteInTransactionAsync(async outerCt =>
        {
            await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Xarici" }, outerCt);

            // İç blok yeni tranzaksiya açmır — xaricinə qoşulur
            await _h.UnitOfWork.ExecuteInTransactionAsync(async innerCt =>
            {
                await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Daxili" }, innerCt);
            }, outerCt);

            throw new ConflictException("xarici blokda xəta");
        });

        await act.Should().ThrowAsync<ConflictException>();

        (await _h.Db.Categories.AsNoTracking().CountAsync())
            .Should().Be(0, "iç blok commit etməməli, hər şey birlikdə geri qayıtmalıdır");
    }

    [Fact]
    public async Task Ic_ice_cagirish_ugurlu_olanda_hamisi_saxlanilir()
    {
        await _h.UnitOfWork.ExecuteInTransactionAsync(async outerCt =>
        {
            await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Xarici" }, outerCt);
            await _h.UnitOfWork.ExecuteInTransactionAsync(async innerCt =>
            {
                await _h.UnitOfWork.Repository<Category>().AddAsync(new Category { Name = "Daxili" }, innerCt);
            }, outerCt);
        });

        (await _h.Db.Categories.AsNoTracking().CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Netice_qaytaran_variant_da_rollback_edir()
    {
        var act = async () => await _h.UnitOfWork.ExecuteInTransactionAsync<int>(async ct =>
        {
            var cat = new Category { Name = "Nəticəli" };
            await _h.UnitOfWork.Repository<Category>().AddAsync(cat, ct);
            await _h.UnitOfWork.SaveChangesAsync(ct);
            throw new ConflictException("xəta");
        });

        await act.Should().ThrowAsync<ConflictException>();
        (await _h.Db.Categories.AsNoTracking().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Netice_qaytaran_variant_ugurlu_halda_deyeri_verir()
    {
        var id = await _h.UnitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var cat = new Category { Name = "Nəticəli" };
            await _h.UnitOfWork.Repository<Category>().AddAsync(cat, ct);
            await _h.UnitOfWork.SaveChangesAsync(ct);
            return cat.Id;
        });

        id.Should().BeGreaterThan(0);
        (await _h.Db.Categories.AsNoTracking().CountAsync()).Should().Be(1);
    }

    public void Dispose() => _h.Dispose();
}
