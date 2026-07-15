using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Hr;

/// <summary>
/// İş qrafiki — işçinin hansı həftə günlərində və hansı saatlarda işlədiyini müəyyən edir.
/// Məs. "Standart (B.e–Cümə)" və ya "Növbəli (Ç.a–Şənbə)".
/// Hər gün üçün ayrıca bayraq saxlanılır — istənilən kombinasiya mümkündür.
/// </summary>
public class WorkSchedule : BaseEntity
{
    public string Name { get; set; } = null!;

    public bool Monday { get; set; }
    public bool Tuesday { get; set; }
    public bool Wednesday { get; set; }
    public bool Thursday { get; set; }
    public bool Friday { get; set; }
    public bool Saturday { get; set; }
    public bool Sunday { get; set; }

    public TimeOnly StartTime { get; set; } = new(9, 0);
    public TimeOnly EndTime { get; set; } = new(18, 0);

    public ICollection<Employee> Employees { get; set; } = [];

    /// <summary>Verilən tarixin bu qrafik üzrə iş günü olub-olmadığını qaytarır.</summary>
    public bool IsWorkDay(DateOnly date) => date.DayOfWeek switch
    {
        DayOfWeek.Monday => Monday,
        DayOfWeek.Tuesday => Tuesday,
        DayOfWeek.Wednesday => Wednesday,
        DayOfWeek.Thursday => Thursday,
        DayOfWeek.Friday => Friday,
        DayOfWeek.Saturday => Saturday,
        DayOfWeek.Sunday => Sunday,
        _ => false
    };
}
