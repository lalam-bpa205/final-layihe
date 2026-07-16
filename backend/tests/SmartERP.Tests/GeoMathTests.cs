using FluentAssertions;
using SmartERP.Application.Features.Transport.Gps;

namespace SmartERP.Tests;

/// <summary>
/// Haversine məsafə hesablaması — GPS izinin uzunluğu və yanacaq
/// sərfiyyatı göstəriciləri buna əsaslanır.
/// </summary>
public class GeoMathTests
{
    [Fact]
    public void Eyni_noqte_arasinda_mesafe_sifirdir()
    {
        GeoMath.DistanceKm(40.4093, 49.8671, 40.4093, 49.8671).Should().Be(0);
    }

    /// <summary>Bakı → Gəncə quş uçuşu ilə təxminən 300 km-dir.</summary>
    [Fact]
    public void Baki_Gence_mesafesi_teqriben_300_km_olur()
    {
        var km = GeoMath.DistanceKm(40.4093, 49.8671, 40.6828, 46.3606);

        km.Should().BeInRange(290, 310);
    }

    /// <summary>Bakı → Sumqayıt təxminən 30 km-dir.</summary>
    [Fact]
    public void Baki_Sumqayit_mesafesi_teqriben_30_km_olur()
    {
        var km = GeoMath.DistanceKm(40.4093, 49.8671, 40.5897, 49.6686);

        km.Should().BeInRange(25, 35);
    }

    /// <summary>1 dərəcə enlik fərqi hər yerdə ~111 km-dir.</summary>
    [Fact]
    public void Bir_derece_enlik_teqriben_111_km_edir()
    {
        GeoMath.DistanceKm(40.0, 49.0, 41.0, 49.0).Should().BeApproximately(111.2, 1.0);
    }

    [Fact]
    public void Mesafe_istiqametden_asili_deyil()
    {
        var forward = GeoMath.DistanceKm(40.4093, 49.8671, 40.6828, 46.3606);
        var backward = GeoMath.DistanceKm(40.6828, 46.3606, 40.4093, 49.8671);

        forward.Should().BeApproximately(backward, 0.0001);
    }

    [Fact]
    public void Mesafe_hemise_musbetdir()
    {
        GeoMath.DistanceKm(-33.8688, 151.2093, 51.5074, -0.1278).Should().BePositive();
    }
}
