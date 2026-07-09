namespace SmartERP.Domain.Enums;

/// <summary>
/// Sistemin modulları. İstifadəçiyə modul icazəsi verildikdə
/// yalnız həmin modulların səhifə və API-lərinə daxil ola bilir.
/// </summary>
public enum AppModule
{
    Hr = 1,
    Inventory = 2,
    Transport = 3,
    Finance = 4,
    Sales = 5,
    Reports = 6,
    Ai = 7
}
