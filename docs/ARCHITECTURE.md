# SmartERP — Memarlıq Sənədi

Bu sənəd layihənin memarlıq qərarlarını və **niyə** məhz belə qurulduğunu izah edir.

---

## 1. Clean Architecture — 4 qat

```
┌─────────────────────────────────────────────┐
│ API           Controller, SignalR Hub,      │
│               Middleware, JWT konfiqurasiya │
├─────────────────────────────────────────────┤
│ Infrastructure  EF Core, Repository, JWT,   │
│                 BCrypt, Excel, OpenAI       │
├─────────────────────────────────────────────┤
│ Application   DTO, Servis, Interfeys,       │
│               Validator, AutoMapper profili │
├─────────────────────────────────────────────┤
│ Domain        Entity, Enum — asılılıq YOX   │
└─────────────────────────────────────────────┘
```

**Asılılıq istiqaməti:** API → Infrastructure → Application → Domain

**Niyə:** biznes qaydaları (Domain + Application) texnologiyadan təcrid olunub.
MySQL-i Postgres-ə dəyişmək lazım gəlsə, yalnız Infrastructure qatı dəyişir —
servis kodlarına toxunulmur. Application qatı `IRepository`/`IUnitOfWork`
interfeyslərinə güvənir, konkret EF Core sinifləri onun üçün görünmür.

---

## 2. Tranzaksiya və rollback məntiqi ⭐

Layihənin ən kritik hissəsi. Bir neçə cədvələ toxunan hər əməliyyat
**atomikdir**: ya hamısı yazılır, ya heç biri.

### Mexanizm

`IUnitOfWork.ExecuteInTransactionAsync(...)` — əməliyyatı DB tranzaksiyası
daxilində icra edir. İstənilən addımda exception atılarsa:
1. `RollbackAsync()` — DB dəyişiklikləri geri qaytarılır
2. `ChangeTracker.Clear()` — yaddaşdakı "kirli" vəziyyət təmizlənir
   (əks halda növbəti `SaveChanges` geri qaytarılmış dəyişikliyi təkrar yazardı)
3. Exception yuxarı ötürülür → Global middleware onu 409/404-ə çevirir

**İç-içə çağırış:** artıq açıq tranzaksiya varsa yenisi açılmır — əməliyyat
mövcud tranzaksiyaya qoşulur, commit/rollback ən xarici blokun məsuliyyətidir.

### Tranzaksiyalı əməliyyatların siyahısı

| Əməliyyat | Bir tranzaksiyada nə baş verir |
|---|---|
| **Satış sifarişinin təsdiqi** | Stok yoxlaması → hər məhsul üçün stok çıxışı → **avtomatik faktura** → status dəyişimi |
| **Alış sifarişinin qəbulu** | Hər məhsul üçün stok girişi → avtomatik xərc qeydi → status |
| **Faktura ödənişi** | Ödəniş qeydi → faktura statusu → **avtomatik gəlir əməliyyatı** |
| **Çatdırılmanın yola salınması** | Çatdırılma + sürücü + avtomobil statusları eyni anda |
| **Anbarlar arası transfer** | Çıxış hərəkəti + giriş hərəkəti (mal "itə" bilməz) |
| **Məzuniyyətin təsdiqi** | Status + hər gün üçün davamiyyət qeydləri |
| **İşçi + hesab yaradılması** | Employee + User + rol təyinatı |
| **Excel import** | Bütün sətirlər — bir sətirdə xəta olsa **heç nə** yazılmır |
| Stok çıxışı, məzuniyyət sorğusu, check-in, faktura ləğvi | Oxu-sonra-yaz yarışının qarşısı alınır (paralel sorğular limiti aşa bilməz) |

### Sübut edilmiş ssenari

**Test:** İki sətirli satış sifarişi — birinci məhsulun stoku var, ikincinin yoxdur.

```
POST /api/sales-orders/3/confirm
→ 409: "Printer HP LaserJet" üçün kifayət qədər stok yoxdur. Mövcud: 0, tələb olunan: 5.
```

Sistem birinci məhsul üçün stok çıxışını **artıq yazmışdı**, amma ikincidə xəta atdı:

| Göstərici | Əvvəl | Sonra |
|---|---|---|
| Birinci məhsulun stoku | 40 | **40** (38 olmadı) |
| Faktura sayı | 3 | **3** (yaranmadı) |
| Stok hərəkəti sayı | 7 | **7** (geri alındı) |
| Sifariş statusu | Gözləyir | **Gözləyir** |

**3 modul (Anbar + Maliyyə + Satış) bir tranzaksiyada — hamısı və ya heç biri.**

---

## 3. Təhlükəsizlik modeli

### Autentifikasiya
- **JWT access token** — 15 dəqiqə (oğurlanma pəncərəsi kiçikdir)
- **Refresh token** — 7 gün, DB-də saxlanılır, **rotasiya olunur**:
  hər yeniləmədə köhnə token ləğv edilir → oğurlanmış token ikinci dəfə işləmir
- Şifrə dəyişəndə bütün aktiv sessiyalar bağlanır
- **BCrypt** (WorkFactor 12) — hər hash ~250ms, brute-force praktiki mümkünsüzdür
- Login-də "istifadəçi yoxdur" və "şifrə səhvdir" **fərqləndirilmir** (user enumeration qarşısı)

### İcazə — iki səviyyəli
1. **Rol** (SuperAdmin, Admin, HRManager, ...) — kobud səviyyə
2. **Modul icazəsi** (`UserModuleAccesses` cədvəli) — dəqiq səviyyə

JWT-yə `module` claim-ləri yazılır, hər controller `[Authorize(Policy = "Module:Hr")]`
kimi qorunur. **UI-da gizlətmək kifayət deyil** — API səviyyəsində də bloklanır
(qeyri-admin modul icazəsi endpoint-inə 403 alır).

Modul icazələrini **yalnız administratorlar** dəyişə bilər.

---

## 4. Audit və soft delete

`AuditInterceptor` (EF Core interceptor) `SaveChanges` zamanı avtomatik:
1. Audit sahələrini doldurur (`CreatedBy`, `UpdatedDate`, ...)
2. Fiziki `DELETE`-i **soft delete**-ə çevirir (`IsDeleted = true`)
3. Hər dəyişikliyi `AuditLogs` cədvəlinə yazır — **köhnə → yeni** dəyərlərlə

**Niyə interceptor-da:** heç bir servisdə əl ilə `CreatedDate = ...` yazmaq lazım
deyil — 30+ cədvəl avtomatik əhatə olunur, unutmaq mümkün deyil (DRY).

Loglar əsas dəyişikliklə **eyni tranzaksiyada** yazılır — əməliyyat rollback
olunarsa log da geri qayıdır (yalançı qeyd qalmır). Şifrə hash-ləri, tokenlər
və çat mesajları məxfilik üçün loglanmır.

Global query filter: `IsDeleted = true` olan sətirlər **heç bir sorğuda** görünmür.

---

## 5. Verilənlər bazası sxemi

**30+ cədvəl, 10 migration.** Əsas qruplar:

| Modul | Cədvəllər |
|---|---|
| Auth | Users, Roles, UserRoles, RefreshTokens, UserModuleAccesses |
| HR | Departments, Positions, Employees, Attendances, LeaveRequests |
| Anbar | Categories, Warehouses, Products, StockMovements |
| Nəqliyyat | Vehicles, Drivers, Deliveries, FuelRecords, MaintenanceRecords |
| Maliyyə | TransactionCategories, FinanceTransactions, Budgets, Invoices, InvoiceItems, Payments |
| Satış | Customers, Suppliers, SalesOrders, SalesOrderItems, PurchaseOrders, PurchaseOrderItems |
| Sistem | Notifications, ChatMessages, AuditLogs |

### Əsas dizayn qərarları

**Stok balansı sütunda saxlanmır** — `StockMovements` cədvəlindəki hərəkətlərin
cəmindən hesablanır (`In/TransferIn` → `+`, `Out/TransferOut` → `−`).
*Niyə:* balans heç vaxt "sürüşmür", hər rəqəmin arxasında izlənə bilən tarixçə var.

**Sürücü ayrıca "insan" deyil** — HR-dakı `Employee`-yə 1:1 bağlıdır (üzərinə
vəsiqə məlumatları əlavə olunur). *Niyə:* logistika şirkətində sürücü həm də
işçidir — maaşı, davamiyyəti HR-da idarə olunur, məlumat təkrarlanmır.

**Silmə qorunması:** işçisi olan şöbə, hərəkəti olan məhsul, sifarişi olan
müştəri silinmir (`DeleteBehavior.Restrict` + servis səviyyəsində yoxlama).

---

## 6. Real-time (SignalR)

İki hub:
- `/hubs/notifications` — qoşulan istifadəçi **modul icazələrinə görə** qruplara
  düşür (`module-Hr`, `module-Inventory`...). Hər kəs yalnız öz modulunun
  bildirişlərini alır; adminlər hamısını.
- `/hubs/chat` — işçilər arası birbaşa yazışma (`Clients.Users` ilə istifadəçinin
  bütün açıq tablarına çatdırılır).

Bildiriş trigger-ləri **tranzaksiya commit olunduqdan sonra** işə düşür —
rollback olunan əməliyyat üçün yalançı bildiriş getmir.

---

## 7. Frontend memarlığı

**Modul-əsaslı naviqasiya:** login-dən sonra istifadəçi modul seçim ekranına
(launcher) düşür. Sidebar yalnız **seçilmiş modulun** menyusunu göstərir —
7 moduldan ibarət nəhəng menyu əvəzinə fokuslanmış iş sahəsi.

**Dizayn sistemi** (`src/components/ui/`) — 12 ortaq komponent (Button, StatCard,
SlideOver, ConfirmDialog, Badge, Avatar, EmptyState, Skeleton, Tabs...).
Bütün modullar eyni komponentləri işlədir → vahid görünüş, sıfır təkrarlama.

**Token idarəetməsi:** axios interceptor hər sorğuya JWT əlavə edir; 401 gələndə
avtomatik refresh edib sorğunu təkrarlayır, alınmasa login səhifəsinə yönləndirir.

**Qrafik rəngləri** rəng korluğu (CVD) və kontrast baxımından validator ilə
yoxlanılıb — mavi `#2a78d6` / narıncı `#eb6834` cütü ΔE > 90 ilə ayrılır.
