# SmartERP — Logistika İdarəetmə Sistemi

Logistika şirkətləri üçün modul əsaslı, tam funksional ERP sistemi.
Kurs layihəsi · **.NET 10 Web API + React 19 + MySQL**

---

## İşə salma

### Tələblər
| Komponent | Versiya | Yoxlama |
|---|---|---|
| .NET SDK | 10.0+ | `dotnet --version` |
| Node.js | 20+ | `node --version` |
| MySQL | 8.0+ | `Get-Service MySQL84` (Windows) |

### 1. Verilənlər bazası
MySQL servisi işləməlidir. Baza (`smarterp`), cədvəllər və başlanğıc məlumatlar
**avtomatik yaranır** — backend ilk dəfə işə düşəndə migration-lar tətbiq olunur və
rollar + admin istifadəçisi seed edilir. Əl ilə SQL icra etməyə ehtiyac yoxdur.

Bağlantı sətri: [`backend/src/SmartERP.API/appsettings.json`](backend/src/SmartERP.API/appsettings.json) → `ConnectionStrings:Default`

### 2. Sistemi qaldırmaq

**Bir kliklə:** layihə qovluğundakı `start.bat` faylını işə salın.

**Əl ilə (2 terminal):**
```powershell
# Terminal 1 — Backend (port 5042)
cd backend\src\SmartERP.API
dotnet run --launch-profile http

# Terminal 2 — Frontend (port 5173)
cd frontend
npm install      # yalnız ilk dəfə
npm run dev
```

### 3. Giriş
| Ünvan | Təyinat |
|---|---|
| http://localhost:5173 | Sayt |
| http://localhost:5042/swagger | API sənədləşməsi |

**Default admin:** `admin` / `Admin123!`

> ⚠️ `npm run dev` "skript icra edilə bilmir" xətası verərsə:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 4. Nümayiş datası

İlk işə düşmədə sistem avtomatik olaraq **12 aylıq real görünüşlü tarixçə** yaradır
(35 müştəri, ~360 sifariş, ~490 maliyyə əməliyyatı, mövsümi dalğalanma ilə).
Söndürmək üçün `appsettings.json`:

```jsonc
"DemoData": { "Enabled": false }
```

Baza artıq doldurulubsa (`Customers >= 5`) seeder təkrar işləmir.

---

## Testlər

```bash
cd backend
dotnet test
```

**46 test** — əsas diqqət çoxcədvəlli əməliyyatların bütövlüyünə yönəlib:

| Sahə | Nə sübut olunur |
|---|---|
| `UnitOfWorkTransactionTests` | DB-yə yazılmış dəyişikliyin rollback olunması, iç-içə tranzaksiyanın xaricinə qoşulması, rollbackdan sonra ChangeTracker-ın təmizlənməsi |
| `SalesOrderConfirmTests` | İkisətirli sifarişdə 2-ci sətir uğursuz olarsa 1-ci sətrin stok çıxışı da geri qayıdır; faktura yaranmır; status dəyişmir |
| `StockTransferTests` | Anbarlar arası köçürmədə ümumi miqdar dəyişmir (mal yoxdan yaranmır/itmir); stok çatmayanda heç nə yazılmır |
| `FuelTransferTests` | Anbar qalığının azalması ilə köçürmə qeydinin atomikliyi; GPS məsafəsinə görə km başına sərfiyyat |
| `WarehouseKeeperTests` | "Bir işçi = bir anbar" qaydası; aktiv olmayan işçi anbardar təyin edilə bilmir |
| `GeoMathTests` | Haversine məsafə hesablamasının düzgünlüyü (Bakı–Gəncə ≈ 300 km) |

> Testlər **SQLite in-memory** üzərində işləyir — EF-in `InMemory` provideri
> tranzaksiyaları dəstəkləmədiyi üçün rollback testləri onunla saxta şəkildə keçərdi.

---

## Modullar

| Modul | İmkanlar |
|---|---|
| 👥 **İnsan Resursları** | İşçilər (profil, status, modul icazələri), şöbələr, vəzifələr, davamiyyət (günlük + aylıq cədvəl), məzuniyyət (21 günlük illik balans nəzarəti) |
| 📦 **Anbar** | Məhsullar (barkod, min. stok), kateqoriyalar, anbarlar, stok hərəkətləri (giriş/çıxış/transfer), 30 günlük stok tarixi qrafiki, az stok xəbərdarlığı |
| 🚚 **Nəqliyyat** | Avtomobillər, sürücülər (vəsiqə müddəti nəzarəti), çatdırılmalar (status timeline), yanacaq və təmir qeydləri, xərc analitikası |
| 💰 **Maliyyə** | Gəlir/xərc, aylıq büdcə limitləri, fakturalar (çap-hazır A4 görünüş), ödənişlər, pul axını, vaxtı keçmiş faktura xəbərdarlığı |
| 🤝 **Satış və Müştərilər** | Müştəri/təchizatçı profilləri (borc balansı), satış və alış sifarişləri, sifariş detalları |
| 📑 **Hesabatlar** | 6 növ Excel export, tranzaksiyalı Excel import (all-or-nothing) |
| 🤖 **AI Köməkçi** | ERP məlumatları əsasında təhlil və tövsiyələr (OpenAI) |
| 📊 **İdarəetmə paneli** | *(yalnız admin)* Bütün modullar üzrə KPI, xəbərdarlıqlar, sistem aktivliyi, audit log mərkəzi |

**Əlavə:** real-time bildirişlər (SignalR), işçilər arası daxili çat, audit jurnalı (kim/nə vaxt/nəyi dəyişdi).

---

## Texnologiyalar

**Backend:** ASP.NET Core 10 · EF Core 9 (Pomelo MySQL) · Clean Architecture · Repository + Unit of Work · AutoMapper · FluentValidation · JWT + refresh token rotasiyası · BCrypt · SignalR · Serilog · Swagger · ClosedXML

**Frontend:** React 19 · Vite · Redux Toolkit · React Router · Tailwind CSS v4 · Recharts · React Hook Form · Axios · SignalR client

---

## Layihə strukturu

```
backend/src/
  SmartERP.Domain/          Entity-lər, enum-lar (heç bir asılılıq yoxdur)
  SmartERP.Application/     DTO-lar, servislər, interfeyslər, validator-lar
  SmartERP.Infrastructure/  EF Core, repozitoriyalar, JWT, Excel, OpenAI
  SmartERP.API/             Controller-lər, SignalR hub-lar, middleware
backend/tests/
  SmartERP.Tests/           xUnit testləri (SQLite in-memory üzərində)
frontend/src/
  components/ui/            Dizayn sistemi (Button, StatCard, SlideOver, ...)
  pages/<modul>/            Modul səhifələri
  modules.js                Modul konfiqurasiyası (naviqasiya + icazələr)
```

Ətraflı: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — memarlıq qərarları, tranzaksiya
məntiqi, təhlükəsizlik modeli və verilənlər bazası sxemi.
