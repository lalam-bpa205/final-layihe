using Microsoft.EntityFrameworkCore;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;
using SmartERP.Infrastructure.Persistence.Interceptors;

namespace SmartERP.Infrastructure.Persistence;

/// <summary>
/// Nümayiş üçün 12 aylıq real görünüşlü tarixçə yaradır — müştərilər, sifarişlər,
/// fakturalar, mövsümi maliyyə axını, çatdırılmalar, davamiyyət.
///
/// Yalnız baza demo data ilə doldurulmayıbsa işə düşür (Customers &lt; 5).
/// Qrafiklər domen tarix sahələrini (Date/OrderDate) işlətdiyi üçün geriyə
/// tarixli data düzgün görünür.
/// </summary>
public static class DemoDataSeeder
{
    // Təkrar icrada eyni nəticə alınsın deyə sabit seed
    private static readonly Random Rnd = new(20260716);

    /// <summary>
    /// Bilərəkdən minimumdan aşağı saxlanılan məhsullar — "az qalıq" xəbərdarlığının
    /// işlədiyi görünsün deyə. Bu məhsullara alış sifarişi yazılmır ki, mədaxil
    /// qalığı yenidən minimumun üstünə qaldırmasın.
    /// </summary>
    private static HashSet<int> _lowStockProductIds = [];

    public static async Task SeedAsync(AppDbContext context, AuditInterceptor auditInterceptor)
    {
        if (await context.Customers.CountAsync() >= 5)
            return; // demo data artıq var

        // Seed minlərlə audit sətri yaratmasın
        auditInterceptor.SuppressLogging = true;
        try
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var start = today.AddMonths(-11);
            var monthStart = new DateOnly(start.Year, start.Month, 1);

            var departments = await SeedDepartmentsAsync(context);
            var positions = await SeedPositionsAsync(context, departments);
            var employees = await SeedEmployeesAsync(context, departments, positions);
            var categories = await SeedCategoriesAsync(context);
            var products = await SeedProductsAsync(context, categories);
            _lowStockProductIds = products.OrderBy(_ => Rnd.Next()).Take(3).Select(p => p.Id).ToHashSet();
            var warehouses = await SeedWarehousesAsync(context, employees);
            var (customers, suppliers) = await SeedPartnersAsync(context);
            var finCategories = await SeedFinanceCategoriesAsync(context);

            var salesOrders = await SeedSalesOrdersAsync(context, customers, products, warehouses, monthStart, today);
            var purchaseOrders = await SeedPurchaseOrdersAsync(context, suppliers, products, warehouses, monthStart, today);
            await SeedStockAsync(context, products, warehouses, salesOrders, purchaseOrders, monthStart);
            var invoices = await SeedInvoicesAsync(context, salesOrders, today);

            var monthlyPayroll = employees.Where(e => e.Status == EmployeeStatus.Active).Sum(e => e.Salary);
            await SeedFinanceAsync(context, finCategories, invoices, salesOrders, monthlyPayroll, monthStart, today);
            await SeedDeliveriesAsync(context, salesOrders, employees, monthStart, today);
            await SeedHrActivityAsync(context, employees, today);
        }
        finally
        {
            auditInterceptor.SuppressLogging = false;
        }
    }

    // ---------- Lüğətlər ----------

    private static async Task<Dictionary<string, Department>> SeedDepartmentsAsync(AppDbContext context)
    {
        var wanted = new (string Name, string Desc)[]
        {
            ("İnformasiya Texnologiyaları", "Proqram təminatı və infrastruktur"),
            ("Nəqliyyat", "Avtopark və çatdırılma əməliyyatları"),
            ("Anbar", "Anbar təsərrüfatı və stok idarəetməsi"),
            ("Satış", "Müştəri münasibətləri və satış"),
            ("Maliyyə", "Mühasibatlıq və maliyyə planlaması"),
            ("İnsan Resursları", "Kadr siyasəti və işə qəbul"),
        };

        var existing = await context.Departments.ToListAsync();
        foreach (var (name, desc) in wanted)
        {
            // "Neqliyyat" kimi köhnə yazılışlar varsa təkrar yaratmırıq
            if (existing.Any(d => Normalize(d.Name) == Normalize(name))) continue;
            var dep = new Department { Name = name, Description = desc };
            context.Departments.Add(dep);
            existing.Add(dep);
        }
        await context.SaveChangesAsync();

        return existing.ToDictionary(d => Normalize(d.Name), d => d);
    }

    private static async Task<Dictionary<string, Position>> SeedPositionsAsync(
        AppDbContext context, Dictionary<string, Department> deps)
    {
        var wanted = new (string Title, string Dep)[]
        {
            ("Backend Developer", "informasiya texnologiyalari"),
            ("Frontend Developer", "informasiya texnologiyalari"),
            ("Sistem Administratoru", "informasiya texnologiyalari"),
            ("Sürücü", "neqliyyat"),
            ("Logistika Koordinatoru", "neqliyyat"),
            ("Anbardar", "anbar"),
            ("Anbar Müdiri", "anbar"),
            ("Satış Meneceri", "satis"),
            ("Satış Təmsilçisi", "satis"),
            ("Mühasib", "maliyye"),
            ("Maliyyə Analitiki", "maliyye"),
            ("HR Meneceri", "insan resurslari"),
        };

        var existing = await context.Positions.ToListAsync();
        foreach (var (title, depKey) in wanted)
        {
            if (!deps.TryGetValue(depKey, out var dep)) continue;
            if (existing.Any(p => Normalize(p.Title) == Normalize(title))) continue;
            var pos = new Position { Title = title, DepartmentId = dep.Id };
            context.Positions.Add(pos);
            existing.Add(pos);
        }
        await context.SaveChangesAsync();

        return existing.ToDictionary(p => Normalize(p.Title), p => p);
    }

    private static async Task<Dictionary<string, Category>> SeedCategoriesAsync(AppDbContext context)
    {
        var wanted = new[] { "Elektronika", "Dəftərxana", "Məişət texnikası", "Şəbəkə avadanlığı", "Aksesuar" };

        var existing = await context.Categories.ToListAsync();
        foreach (var name in wanted)
        {
            if (existing.Any(c => Normalize(c.Name) == Normalize(name))) continue;
            var cat = new Category { Name = name };
            context.Categories.Add(cat);
            existing.Add(cat);
        }
        await context.SaveChangesAsync();

        return existing.ToDictionary(c => Normalize(c.Name), c => c);
    }

    private static async Task<List<TransactionCategory>> SeedFinanceCategoriesAsync(AppDbContext context)
    {
        var wanted = new (string Name, TransactionType Type)[]
        {
            ("Faktura ödənişləri", TransactionType.Income),
            ("Xidmət gəliri", TransactionType.Income),
            ("Digər gəlir", TransactionType.Income),
            ("Alışlar", TransactionType.Expense),
            ("Yanacaq", TransactionType.Expense),
            ("Əmək haqqı", TransactionType.Expense),
            ("İcarə", TransactionType.Expense),
            ("Kommunal", TransactionType.Expense),
            ("Nəqliyyat təmiri", TransactionType.Expense),
            ("Marketinq", TransactionType.Expense),
            ("Vergi və rüsumlar", TransactionType.Expense),
        };

        var existing = await context.TransactionCategories.ToListAsync();
        foreach (var (name, type) in wanted)
        {
            if (existing.Any(c => Normalize(c.Name) == Normalize(name) && c.Type == type)) continue;
            var cat = new TransactionCategory { Name = name, Type = type };
            context.TransactionCategories.Add(cat);
            existing.Add(cat);
        }
        await context.SaveChangesAsync();
        return existing;
    }

    // ---------- İşçilər ----------

    private static async Task<List<Employee>> SeedEmployeesAsync(
        AppDbContext context, Dictionary<string, Department> deps, Dictionary<string, Position> pos)
    {
        var schedules = await context.WorkSchedules.ToListAsync();
        var defaultSchedule = schedules.FirstOrDefault();
        var shiftSchedule = schedules.Skip(1).FirstOrDefault() ?? defaultSchedule;

        // (Ad, Soyad, vəzifə açarı, departament açarı, maaş)
        var people = new (string First, string Last, string Pos, string Dep, decimal Salary)[]
        {
            ("Elvin", "Məmmədov", "backend developer", "informasiya texnologiyalari", 3200),
            ("Aysel", "Hüseynova", "frontend developer", "informasiya texnologiyalari", 2900),
            ("Rəşad", "Quliyev", "sistem administratoru", "informasiya texnologiyalari", 2600),
            ("Günel", "Əliyeva", "hr meneceri", "insan resurslari", 2400),
            ("Orxan", "Səfərov", "satis meneceri", "satis", 3000),
            ("Nərmin", "İsmayılova", "satis temsilcisi", "satis", 1800),
            ("Tural", "Bağırov", "satis temsilcisi", "satis", 1750),
            ("Leyla", "Kərimova", "muhasib", "maliyye", 2500),
            ("Kamran", "Vəliyev", "maliyye analitiki", "maliyye", 2700),
            ("Sevinc", "Abbasova", "anbardar", "anbar", 1600),
            ("Ramil", "Novruzov", "anbardar", "anbar", 1600),
            ("Aygün", "Həsənova", "anbar mudiri", "anbar", 2200),
            ("Vüqar", "Cəfərov", "logistika koordinatoru", "neqliyyat", 2300),
            ("Ülviyyə", "Rəhimova", "satis temsilcisi", "satis", 1700),
            ("Emin", "Sultanov", "surucu", "neqliyyat", 1500),
            ("Fərid", "Mustafayev", "surucu", "neqliyyat", 1500),
            ("Samir", "Babayev", "surucu", "neqliyyat", 1450),
            ("Cavid", "Əhmədov", "surucu", "neqliyyat", 1450),
            ("Türkan", "Salmanova", "muhasib", "maliyye", 2100),
            ("Xəyalə", "Nəsirova", "satis temsilcisi", "satis", 1700),
        };

        var created = new List<Employee>();
        var existingEmails = await context.Employees.Select(e => e.Email).ToListAsync();

        foreach (var (first, last, posKey, depKey, salary) in people)
        {
            var email = $"{Translit(first)}.{Translit(last)}@smarterp.az";
            if (existingEmails.Contains(email)) continue;
            if (!pos.TryGetValue(posKey, out var position) || !deps.TryGetValue(depKey, out var dep)) continue;

            var emp = new Employee
            {
                FirstName = first,
                LastName = last,
                Email = email,
                Phone = $"+9945{Rnd.Next(0, 10)}{Rnd.Next(1000000, 9999999)}",
                BirthDate = new DateOnly(Rnd.Next(1980, 2001), Rnd.Next(1, 13), Rnd.Next(1, 28)),
                HireDate = DateOnly.FromDateTime(DateTime.Today).AddDays(-Rnd.Next(120, 1800)),
                Salary = salary,
                Address = $"Bakı, {RandomOf("Nəsimi", "Yasamal", "Xətai", "Nizami", "Səbail", "Binəqədi")} r.",
                DepartmentId = dep.Id,
                PositionId = position.Id,
                // Anbar və nəqliyyat növbəli qrafikdə işləyir
                WorkScheduleId = (depKey is "anbar" or "neqliyyat" ? shiftSchedule : defaultSchedule)?.Id,
                Status = EmployeeStatus.Active
            };
            context.Employees.Add(emp);
            created.Add(emp);
        }
        await context.SaveChangesAsync();

        await SeedDriversAsync(context, created);
        return await context.Employees.Include(e => e.Position).ToListAsync();
    }

    /// <summary>Sürücü vəzifəli işçiləri Drivers cədvəlinə bağlayır.</summary>
    private static async Task SeedDriversAsync(AppDbContext context, List<Employee> employees)
    {
        var existingEmployeeIds = await context.Drivers.Select(d => d.EmployeeId).ToListAsync();
        var driverPositionIds = await context.Positions
            .Where(p => p.Title == "Sürücü").Select(p => p.Id).ToListAsync();

        var categories = new[] { "B, C", "C, CE", "B, C, CE", "C" };
        var i = 0;

        foreach (var emp in employees.Where(e => driverPositionIds.Contains(e.PositionId)))
        {
            if (existingEmployeeIds.Contains(emp.Id)) continue;
            context.Drivers.Add(new Driver
            {
                EmployeeId = emp.Id,
                LicenseNumber = $"AZ{Rnd.Next(1000000, 9999999)}",
                LicenseCategories = categories[i++ % categories.Length],
                LicenseExpiryDate = DateOnly.FromDateTime(DateTime.Today).AddDays(Rnd.Next(200, 1500)),
                Status = DriverStatus.Available
            });
        }
        await context.SaveChangesAsync();
    }

    // ---------- Məhsullar və anbarlar ----------

    private static async Task<List<Product>> SeedProductsAsync(AppDbContext context, Dictionary<string, Category> cats)
    {
        // (Ad, kateqoriya, vahid, alış, satış, min. stok)
        var items = new (string Name, string Cat, string Unit, decimal Buy, decimal Sell, decimal Min)[]
        {
            ("Noutbuk HP ProBook 450", "elektronika", "ədəd", 1150, 1590, 10),
            ("Noutbuk Asus VivoBook 15", "elektronika", "ədəd", 780, 1090, 10),
            ("Noutbuk Dell Latitude 3540", "elektronika", "ədəd", 1250, 1740, 8),
            ("Monitor Samsung 24\"", "elektronika", "ədəd", 210, 299, 15),
            ("Monitor LG 27\" IPS", "elektronika", "ədəd", 320, 449, 12),
            ("Telefon Samsung Galaxy A55", "elektronika", "ədəd", 720, 999, 15),
            ("Planşet Samsung Tab A9", "elektronika", "ədəd", 340, 469, 10),
            ("Proyektor Epson EB-X06", "elektronika", "ədəd", 690, 940, 4),
            ("Skaner Canon LiDE 300", "elektronika", "ədəd", 95, 139, 6),
            ("Printer Canon i-SENSYS", "elektronika", "ədəd", 280, 385, 6),
            ("UPS APC 650VA", "elektronika", "ədəd", 105, 155, 10),
            ("Şəbəkə routeri TP-Link Archer C6", "sebeke avadanligi", "ədəd", 55, 85, 20),
            ("Switch TP-Link 8 port", "sebeke avadanligi", "ədəd", 40, 62, 15),
            ("Access Point Ubiquiti", "sebeke avadanligi", "ədəd", 180, 245, 8),
            ("Şəbəkə kabeli UTP Cat6 (305m)", "sebeke avadanligi", "rulon", 190, 265, 5),
            ("Klaviatura Logitech K380", "aksesuar", "ədəd", 48, 72, 25),
            ("Siçan Logitech M170", "aksesuar", "ədəd", 18, 29, 40),
            ("Qulaqlıq Logitech H340", "aksesuar", "ədəd", 32, 49, 20),
            ("Xarici disk WD 1TB", "aksesuar", "ədəd", 78, 115, 15),
            ("Flash kart SanDisk 64GB", "aksesuar", "ədəd", 12, 21, 50),
            ("Noutbuk çantası 15.6\"", "aksesuar", "ədəd", 22, 38, 30),
            ("Toner kartric HP 106A", "defterxana", "ədəd", 52, 78, 20),
            ("Qələm dəsti (10 ədəd)", "defterxana", "dəst", 3.2m, 5.5m, 60),
            ("Qovluq A4 (arxiv)", "defterxana", "ədəd", 1.8m, 3.2m, 100),
            ("Steepler dəsti", "defterxana", "dəst", 6.5m, 11, 40),
            ("Marker dəsti (4 rəng)", "defterxana", "dəst", 4.2m, 7.5m, 50),
            ("Mikrodalğalı soba Samsung", "meiset texnikasi", "ədəd", 260, 359, 6),
            ("Soyuducu Bosch KGN39", "meiset texnikasi", "ədəd", 1350, 1790, 4),
            ("Elektrik çaydanı Philips", "meiset texnikasi", "ədəd", 45, 69, 12),
            ("Kondisioner Samsung 12k BTU", "meiset texnikasi", "ədəd", 890, 1250, 5),
        };

        var existingNames = await context.Products.Select(p => p.Name).ToListAsync();
        var barcodeBase = 2000000000000;
        var idx = 0;

        foreach (var (name, catKey, unit, buy, sell, min) in items)
        {
            idx++;
            if (existingNames.Contains(name)) continue;
            if (!cats.TryGetValue(catKey, out var cat)) continue;

            context.Products.Add(new Product
            {
                Name = name,
                Barcode = (barcodeBase + idx).ToString(),
                Unit = unit,
                PurchasePrice = buy,
                SalePrice = sell,
                MinStockLevel = min,
                CategoryId = cat.Id
            });
        }
        await context.SaveChangesAsync();
        return await context.Products.ToListAsync();
    }

    private static async Task<List<Warehouse>> SeedWarehousesAsync(AppDbContext context, List<Employee> employees)
    {
        var existing = await context.Warehouses.ToListAsync();

        if (!existing.Any(w => Normalize(w.Name).Contains("sumqayit")))
        {
            var w = new Warehouse { Name = "Sumqayıt Anbarı", Location = "Sumqayıt, sənaye zonası" };
            context.Warehouses.Add(w);
            existing.Add(w);
        }
        await context.SaveChangesAsync();

        // Anbardar vəzifəli işçiləri anbarlara təyin edirik (bir işçi = bir anbar)
        var keepers = employees
            .Where(e => e.Position.Title is "Anbardar" or "Anbar Müdiri")
            .OrderBy(e => e.Id)
            .ToList();

        var assigned = await context.Warehouses.Where(w => w.KeeperId != null).Select(w => w.KeeperId!.Value).ToListAsync();
        var i = 0;
        foreach (var w in existing.OrderBy(x => x.Id))
        {
            if (w.KeeperId is not null) continue;
            var keeper = keepers.Skip(i).FirstOrDefault(k => !assigned.Contains(k.Id));
            if (keeper is null) break;
            w.KeeperId = keeper.Id;
            assigned.Add(keeper.Id);
            i++;
        }
        await context.SaveChangesAsync();

        return await context.Warehouses.ToListAsync();
    }

    private static async Task<(List<Customer>, List<Supplier>)> SeedPartnersAsync(AppDbContext context)
    {
        var customerNames = new[]
        {
            "Azərsun Holding", "Gilan Holding", "Veysəloğlu MMC", "Bakı Ticarət MMC",
            "Xəzər Logistika MMC", "Caspian Trade MMC", "AzTexnika MMC", "Ulduz Market MMC",
            "Zəfər Tikinti MMC", "Bravo Supermarket", "Araz Market MMC", "Neptun Market",
            "Rahat Market MMC", "Baku Electronics", "Kontakt Home", "Optimal Elektronika",
            "İrşad Telecom", "Almaz Ticarət MMC", "Şəfa Aptek MMC", "Meqa Ticarət MMC",
            "Nurgün MMC", "Palma Distribution", "Sahil Ticarət MMC", "Günəş Distribution",
            "Xətai Ticarət MMC", "Abşeron Trade MMC", "Karvan Logistics MMC", "Zirvə Group MMC",
            "Turan Ticarət MMC", "Rəvan MMC", "Muğan Aqro MMC", "Şirvan Ticarət MMC",
            "Lənkəran Aqro MMC", "Quba Meyvə MMC", "Naxçıvan Ticarət MMC",
        };

        var supplierNames = new[]
        {
            "Samsung Azerbaijan", "LG Electronics AZ", "Bosch Azərbaycan", "Philips Distribution",
            "Lenovo Distribution AZ", "HP Distribution AZ", "Canon Azərbaycan", "Dell Azərbaycan",
            "Asus Baltic AZ", "TP-Link Azərbaycan", "Logitech Distribution", "Epson AZ",
        };

        var contacts = new[]
        {
            "Elçin Məmmədov", "Aynur Quliyeva", "Rauf Həsənov", "Səbinə Əliyeva", "Nicat Rəhimov",
            "Könül Bağırova", "Anar Süleymanov", "Lalə Vəliyeva", "Rəsul İbrahimov", "Aytən Cəfərova",
        };

        var existingCustomers = await context.Customers.Select(c => c.Name).ToListAsync();
        foreach (var name in customerNames)
        {
            if (existingCustomers.Contains(name)) continue;
            context.Customers.Add(new Customer
            {
                Name = name,
                ContactName = RandomOf(contacts),
                Phone = $"+99412{Rnd.Next(1000000, 9999999)}",
                Email = $"info@{Translit(name.Split(' ')[0])}.az",
                Address = $"{RandomOf("Bakı", "Sumqayıt", "Gəncə", "Şirvan", "Mingəçevir")}, " +
                          $"{RandomOf("Nizami", "Heydər Əliyev", "Azadlıq", "İstiqlaliyyət")} küç. {Rnd.Next(1, 120)}"
            });
        }

        var existingSuppliers = await context.Suppliers.Select(s => s.Name).ToListAsync();
        foreach (var name in supplierNames)
        {
            if (existingSuppliers.Contains(name)) continue;
            context.Suppliers.Add(new Supplier
            {
                Name = name,
                ContactName = RandomOf(contacts),
                Phone = $"+99412{Rnd.Next(1000000, 9999999)}",
                Email = $"sales@{Translit(name.Split(' ')[0])}.az",
                Address = $"Bakı, {RandomOf("Xətai", "Nərimanov", "Nəsimi")} r."
            });
        }
        await context.SaveChangesAsync();

        return (await context.Customers.ToListAsync(), await context.Suppliers.ToListAsync());
    }

    // ---------- Sifarişlər ----------

    /// <summary>
    /// Ayın mövsümi əmsalı — payız/qış aktiv, yay sakit.
    /// Qrafiklərdə düz xətt yox, real dalğalanma görünsün deyə.
    /// </summary>
    private static double SeasonFactor(int month) => month switch
    {
        1 => 0.75,  // yanvar — bayram sonrası durğunluq
        2 => 0.85,
        3 => 1.00,
        4 => 1.05,
        5 => 1.00,
        6 => 0.85,
        7 => 0.70,  // yay — ən sakit
        8 => 0.75,
        9 => 1.25,  // sentyabr — məktəb/ofis mövsümü
        10 => 1.30,
        11 => 1.20,
        12 => 1.35, // dekabr — il sonu
        _ => 1.0
    };

    /// <summary>
    /// Topdan sifariş miqdarı — bahalı mal az, ucuz mal çox alınır.
    /// Marketlər/şirkətlər ədəd-ədəd deyil, partiya ilə sifariş verir.
    /// </summary>
    private static int BulkQuantity(decimal salePrice) => salePrice switch
    {
        > 800 => Rnd.Next(2, 9),
        > 200 => Rnd.Next(6, 25),
        > 50 => Rnd.Next(15, 60),
        _ => Rnd.Next(30, 120)
    };

    private static async Task<List<SalesOrder>> SeedSalesOrdersAsync(
        AppDbContext context, List<Customer> customers, List<Product> products,
        List<Warehouse> warehouses, DateOnly monthStart, DateOnly today)
    {
        var seq = await NextSequenceAsync(context.SalesOrders.Select(o => o.Number), "SO-");
        var orders = new List<SalesOrder>();

        for (var m = monthStart; m <= today; m = m.AddMonths(1))
        {
            // B2B distribusiya: ayda ~30 topdan sifariş — dövriyyə əməkhaqqı və
            // digər xərcləri örtəcək həcmdə olsun deyə
            var count = (int)Math.Round(30 * SeasonFactor(m.Month)) + Rnd.Next(-3, 4);
            var daysInMonth = DateTime.DaysInMonth(m.Year, m.Month);

            for (var i = 0; i < count; i++)
            {
                var day = Rnd.Next(1, daysInMonth + 1);
                var date = new DateOnly(m.Year, m.Month, day);
                if (date > today) continue;

                var order = new SalesOrder
                {
                    Number = $"SO-{seq++:D5}",
                    CustomerId = RandomOf(customers).Id,
                    OrderDate = date,
                    WarehouseId = RandomOf(warehouses).Id,
                    // Köhnə sifarişlər əsasən bağlanıb, yenilər gözləmədə ola bilər
                    Status = date < today.AddDays(-14)
                        ? (Rnd.NextDouble() < 0.94 ? SalesOrderStatus.Confirmed : SalesOrderStatus.Cancelled)
                        : (Rnd.NextDouble() < 0.55 ? SalesOrderStatus.Confirmed : SalesOrderStatus.Pending),
                    Items = []
                };

                var lineCount = Rnd.Next(2, 6);
                decimal total = 0;
                foreach (var product in PickDistinct(products, lineCount))
                {
                    var qty = BulkQuantity(product.SalePrice);
                    var line = new SalesOrderItem
                    {
                        ProductId = product.Id,
                        Quantity = qty,
                        UnitPrice = product.SalePrice,
                        LineTotal = qty * product.SalePrice
                    };
                    total += line.LineTotal;
                    order.Items.Add(line);
                }
                order.TotalAmount = total;
                orders.Add(order);
            }
        }

        context.SalesOrders.AddRange(orders);
        await context.SaveChangesAsync();
        return orders;
    }

    private static async Task<List<PurchaseOrder>> SeedPurchaseOrdersAsync(
        AppDbContext context, List<Supplier> suppliers, List<Product> products,
        List<Warehouse> warehouses, DateOnly monthStart, DateOnly today)
    {
        var seq = await NextSequenceAsync(context.PurchaseOrders.Select(o => o.Number), "PO-");
        var orders = new List<PurchaseOrder>();

        // Az qalıqlı məhsullar alınmır — məhz ona görə qalıqları azdır
        var buyable = products.Where(p => !_lowStockProductIds.Contains(p.Id)).ToList();

        for (var m = monthStart; m <= today; m = m.AddMonths(1))
        {
            // Satışdan bir ay qabaq mal alınır — payıza hazırlıq yayda başlayır
            var count = (int)Math.Round(3 * SeasonFactor(m.AddMonths(1).Month)) + Rnd.Next(0, 2);
            var daysInMonth = DateTime.DaysInMonth(m.Year, m.Month);

            for (var i = 0; i < count; i++)
            {
                var date = new DateOnly(m.Year, m.Month, Rnd.Next(1, daysInMonth + 1));
                if (date > today) continue;

                var order = new PurchaseOrder
                {
                    Number = $"PO-{seq++:D5}",
                    SupplierId = RandomOf(suppliers).Id,
                    OrderDate = date,
                    WarehouseId = RandomOf(warehouses).Id,
                    Status = date < today.AddDays(-10)
                        ? PurchaseOrderStatus.Received
                        : (Rnd.NextDouble() < 0.5 ? PurchaseOrderStatus.Received : PurchaseOrderStatus.Pending),
                    Items = []
                };

                decimal total = 0;
                foreach (var product in PickDistinct(buyable, Rnd.Next(3, 8)))
                {
                    var qty = BulkQuantity(product.SalePrice) * 2; // ehtiyat üçün partiya ilə alınır
                    var line = new PurchaseOrderItem
                    {
                        ProductId = product.Id,
                        Quantity = qty,
                        UnitPrice = product.PurchasePrice,
                        LineTotal = qty * product.PurchasePrice
                    };
                    total += line.LineTotal;
                    order.Items.Add(line);
                }
                order.TotalAmount = total;
                orders.Add(order);
            }
        }

        context.PurchaseOrders.AddRange(orders);
        await context.SaveChangesAsync();
        return orders;
    }

    // ---------- Stok ----------

    /// <summary>
    /// Əvvəlcə satışların tələb etdiyi çıxışı hesablayır, sonra ondan çox giriş yazır —
    /// beləliklə qalıq heç vaxt mənfi olmur. Bir neçə məhsul bilərəkdən minimumdan
    /// aşağı saxlanılır ki, "az qalıq" xəbərdarlığı işlədiyi görünsün.
    /// </summary>
    private static async Task SeedStockAsync(
        AppDbContext context, List<Product> products, List<Warehouse> warehouses,
        List<SalesOrder> salesOrders, List<PurchaseOrder> purchaseOrders, DateOnly monthStart)
    {
        var movements = new List<StockMovement>();

        // Satışdan yaranan çıxışlar (yalnız təsdiqlənmiş sifarişlər)
        var outByKey = new Dictionary<(int ProductId, int WarehouseId), decimal>();
        foreach (var order in salesOrders.Where(o => o.Status == SalesOrderStatus.Confirmed))
            foreach (var item in order.Items)
            {
                var key = (item.ProductId, order.WarehouseId);
                outByKey[key] = outByKey.GetValueOrDefault(key) + item.Quantity;
            }

        // Hər məhsul/anbar üçün açılış girişi: satış çıxışı + qalacaq qalıq.
        // "Az qalıq" xəbərdarlığı bütün anbarların CƏMİNİ minimumla müqayisə etdiyi üçün
        // seçilmiş məhsullarda hər anbarda minimumun ~20%-i saxlanılır (cəmi ≈ 60% < minimum).
        foreach (var product in products)
        {
            var isLow = _lowStockProductIds.Contains(product.Id);

            foreach (var warehouse in warehouses)
            {
                var needed = outByKey.GetValueOrDefault((product.Id, warehouse.Id));

                var remaining = isLow
                    ? Math.Round(product.MinStockLevel * 0.2m)
                    : product.MinStockLevel + Rnd.Next(10, 60);

                var inQty = needed + remaining;
                if (inQty <= 0) continue;

                movements.Add(new StockMovement
                {
                    ProductId = product.Id,
                    WarehouseId = warehouse.Id,
                    Type = StockMovementType.In,
                    Quantity = inQty,
                    UnitPrice = product.PurchasePrice,
                    Note = "Açılış qalığı"
                });
            }
        }

        // Təsdiqlənmiş sifarişlərin çıxışları
        foreach (var order in salesOrders.Where(o => o.Status == SalesOrderStatus.Confirmed))
            foreach (var item in order.Items)
                movements.Add(new StockMovement
                {
                    ProductId = item.ProductId,
                    WarehouseId = order.WarehouseId,
                    Type = StockMovementType.Out,
                    Quantity = item.Quantity,
                    Note = $"{order.Number} sifarişi üzrə satış"
                });

        // Qəbul edilmiş alışların girişləri
        foreach (var order in purchaseOrders.Where(o => o.Status == PurchaseOrderStatus.Received))
            foreach (var item in order.Items)
                movements.Add(new StockMovement
                {
                    ProductId = item.ProductId,
                    WarehouseId = order.WarehouseId,
                    Type = StockMovementType.In,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Note = $"{order.Number} alışı üzrə mədaxil"
                });

        context.StockMovements.AddRange(movements);
        await context.SaveChangesAsync();
    }

    // ---------- Fakturalar ----------

    private static async Task<List<Invoice>> SeedInvoicesAsync(
        AppDbContext context, List<SalesOrder> salesOrders, DateOnly today)
    {
        var seq = await NextSequenceAsync(context.Invoices.Select(i => i.Number), "INV-");
        var invoices = new List<Invoice>();

        var customers = await context.Customers.ToDictionaryAsync(c => c.Id, c => c.Name);
        var confirmed = salesOrders.Where(o => o.Status == SalesOrderStatus.Confirmed).ToList();

        foreach (var order in confirmed)
        {
            var issue = order.OrderDate.AddDays(Rnd.Next(0, 3));
            var due = issue.AddDays(30);

            var invoice = new Invoice
            {
                Number = $"INV-{seq++:D5}",
                CustomerName = customers.GetValueOrDefault(order.CustomerId, "Müştəri"),
                IssueDate = issue,
                DueDate = due,
                TotalAmount = order.TotalAmount,
                Note = $"{order.Number} sifarişi üzrə",
                Items = [],
                Payments = []
            };

            foreach (var item in order.Items)
                invoice.Items.Add(new InvoiceItem
                {
                    Description = $"Məhsul #{item.ProductId}",
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    LineTotal = item.LineTotal
                });

            // Ödəniş davranışı: köhnə fakturalar əsasən ödənilib,
            // bir hissəsi gecikib (dashboard xəbərdarlığı üçün), yenilər hələ açıqdır.
            var roll = Rnd.NextDouble();
            if (due < today)
            {
                if (roll < 0.80)
                {
                    invoice.Status = InvoiceStatus.Paid;
                    invoice.Payments.Add(new Payment
                    {
                        Date = issue.AddDays(Rnd.Next(3, 28)),
                        Amount = invoice.TotalAmount,
                        Method = RandomOf(PaymentMethod.BankTransfer, PaymentMethod.Card, PaymentMethod.Cash)
                    });
                }
                else if (roll < 0.90)
                {
                    invoice.Status = InvoiceStatus.PartiallyPaid;
                    invoice.Payments.Add(new Payment
                    {
                        Date = issue.AddDays(Rnd.Next(5, 25)),
                        Amount = Math.Round(invoice.TotalAmount * 0.5m, 2),
                        Method = PaymentMethod.BankTransfer
                    });
                }
                else
                {
                    invoice.Status = InvoiceStatus.Unpaid; // gecikmiş
                }
            }
            else
            {
                if (roll < 0.45)
                {
                    invoice.Status = InvoiceStatus.Paid;
                    invoice.Payments.Add(new Payment
                    {
                        Date = issue.AddDays(Rnd.Next(1, 15)),
                        Amount = invoice.TotalAmount,
                        Method = RandomOf(PaymentMethod.BankTransfer, PaymentMethod.Card)
                    });
                }
                else
                {
                    invoice.Status = InvoiceStatus.Unpaid;
                }
            }

            invoices.Add(invoice);
        }

        context.Invoices.AddRange(invoices);
        await context.SaveChangesAsync();

        // Sifarişləri fakturalara bağlayırıq
        for (var i = 0; i < confirmed.Count; i++)
            confirmed[i].InvoiceId = invoices[i].Id;
        await context.SaveChangesAsync();

        return invoices;
    }

    // ---------- Maliyyə ----------

    private static async Task SeedFinanceAsync(
        AppDbContext context, List<TransactionCategory> categories,
        List<Invoice> invoices, List<SalesOrder> salesOrders, decimal monthlyPayroll,
        DateOnly monthStart, DateOnly today)
    {
        var transactions = new List<FinanceTransaction>();
        TransactionCategory Cat(string name, TransactionType type) =>
            categories.First(c => Normalize(c.Name) == Normalize(name) && c.Type == type);

        var invoiceIncome = Cat("Faktura ödənişləri", TransactionType.Income);
        var serviceIncome = Cat("Xidmət gəliri", TransactionType.Income);
        var purchases = Cat("Alışlar", TransactionType.Expense);
        var fuel = Cat("Yanacaq", TransactionType.Expense);
        var salary = Cat("Əmək haqqı", TransactionType.Expense);
        var rent = Cat("İcarə", TransactionType.Expense);
        var utility = Cat("Kommunal", TransactionType.Expense);
        var repair = Cat("Nəqliyyat təmiri", TransactionType.Expense);
        var marketing = Cat("Marketinq", TransactionType.Expense);
        var tax = Cat("Vergi və rüsumlar", TransactionType.Expense);

        // 1) Faktura ödənişləri → gəlir
        foreach (var invoice in invoices)
            foreach (var payment in invoice.Payments)
                transactions.Add(new FinanceTransaction
                {
                    Type = TransactionType.Income,
                    CategoryId = invoiceIncome.Id,
                    Date = payment.Date,
                    Amount = payment.Amount,
                    Method = payment.Method,
                    Description = $"{invoice.Number} üzrə ödəniş — {invoice.CustomerName}"
                });

        // Ayın satış dövriyyəsi — alış xərci bundan törəyir ki, gəlir/xərc
        // nisbəti real olsun (sabit xərc yazsaq şirkət hər ay zərərdə görünərdi)
        var salesByMonth = salesOrders
            .Where(o => o.Status == SalesOrderStatus.Confirmed)
            .GroupBy(o => (o.OrderDate.Year, o.OrderDate.Month))
            .ToDictionary(g => g.Key, g => g.Sum(o => o.TotalAmount));

        // 2) Aylıq təkrarlanan xərclər və əlavə gəlirlər
        for (var m = monthStart; m <= today; m = m.AddMonths(1))
        {
            var season = SeasonFactor(m.Month);
            var daysInMonth = DateTime.DaysInMonth(m.Year, m.Month);
            DateOnly Day(int d) => new(m.Year, m.Month, Math.Min(d, daysInMonth));

            var monthSales = salesByMonth.GetValueOrDefault((m.Year, m.Month));

            // Sabit xərclər — əmək haqqı faktiki maaş fondundan (+ vergi/ayırmalar)
            Add(salary, Day(5), monthlyPayroll * 1.2m + Rnd.Next(-800, 1200), PaymentMethod.BankTransfer, "Aylıq əmək haqqı");
            Add(rent, Day(3), 4500, PaymentMethod.BankTransfer, "Anbar və ofis icarəsi");
            Add(utility, Day(8), 900 + Rnd.Next(-150, 400), PaymentMethod.BankTransfer, "Kommunal xidmətlər");

            // Vergi dövriyyə ilə mütənasib
            Add(tax, Day(20), monthSales * 0.035m + Rnd.Next(-400, 900), PaymentMethod.BankTransfer, "Aylıq vergi ödənişi");

            // Malın maya dəyəri satış dövriyyəsinin ~62%-i — 3-4 ödənişə bölünür
            var cogs = monthSales * 0.62m;
            if (cogs > 0)
            {
                var parts = Rnd.Next(3, 5);
                for (var i = 0; i < parts; i++)
                    Add(purchases, Day(Rnd.Next(1, daysInMonth + 1)),
                        cogs / parts * (decimal)(0.85 + Rnd.NextDouble() * 0.3),
                        PaymentMethod.BankTransfer, "Təchizatçıya ödəniş");
            }

            // Dəyişkən xərclər — mövsümlə bağlı
            var fuelCount = 3 + Rnd.Next(0, 3);
            for (var i = 0; i < fuelCount; i++)
                Add(fuel, Day(Rnd.Next(1, daysInMonth + 1)),
                    (decimal)(1400 * season) + Rnd.Next(-200, 500), PaymentMethod.Card, "Yanacaq doldurma");

            if (Rnd.NextDouble() < 0.6)
                Add(repair, Day(Rnd.Next(1, daysInMonth + 1)), 400 + Rnd.Next(0, 1800), PaymentMethod.Cash, "Avtomobil təmiri");

            if (Rnd.NextDouble() < 0.5)
                Add(marketing, Day(Rnd.Next(1, daysInMonth + 1)),
                    (decimal)(2500 * season) + Rnd.Next(-500, 1500), PaymentMethod.Card, "Reklam və tanıtım");

            // Əlavə xidmət gəliri (logistika xidməti)
            var serviceCount = 2 + Rnd.Next(0, 3);
            for (var i = 0; i < serviceCount; i++)
                Add(serviceIncome, Day(Rnd.Next(1, daysInMonth + 1)),
                    (decimal)(6000 * season) + Rnd.Next(-1000, 3000), PaymentMethod.BankTransfer, "Çatdırılma xidməti haqqı");
        }

        void Add(TransactionCategory cat, DateOnly date, decimal amount, PaymentMethod method, string desc)
        {
            if (date > today) return;
            transactions.Add(new FinanceTransaction
            {
                Type = cat.Type,
                CategoryId = cat.Id,
                Date = date,
                Amount = Math.Round(Math.Max(amount, 50), 2),
                Method = method,
                Description = desc
            });
        }

        context.FinanceTransactions.AddRange(transactions);
        await context.SaveChangesAsync();

        await SeedBudgetsAsync(context, categories, today);
    }

    private static async Task SeedBudgetsAsync(AppDbContext context, List<TransactionCategory> categories, DateOnly today)
    {
        // Limitlər faktiki xərc səviyyəsinə yaxın — bəziləri bilərəkdən sıxdır
        // ki, büdcə səhifəsində "limit aşılıb" halı da görünsün
        var limits = new (string Name, decimal Limit)[]
        {
            ("Alışlar", 260000), ("Yanacaq", 8000), ("Əmək haqqı", 62000),
            ("İcarə", 5000), ("Kommunal", 1500), ("Marketinq", 4000), ("Nəqliyyat təmiri", 2000),
        };

        var existing = await context.Budgets
            .Select(b => new { b.Year, b.Month, b.CategoryId }).ToListAsync();

        // Cari və əvvəlki ay üçün büdcə
        foreach (var offset in new[] { -1, 0 })
        {
            var m = new DateOnly(today.Year, today.Month, 1).AddMonths(offset);
            foreach (var (name, limit) in limits)
            {
                var cat = categories.FirstOrDefault(c =>
                    Normalize(c.Name) == Normalize(name) && c.Type == TransactionType.Expense);
                if (cat is null) continue;
                if (existing.Any(b => b.Year == m.Year && b.Month == m.Month && b.CategoryId == cat.Id)) continue;

                context.Budgets.Add(new Budget
                {
                    Year = m.Year,
                    Month = m.Month,
                    CategoryId = cat.Id,
                    LimitAmount = limit
                });
            }
        }
        await context.SaveChangesAsync();
    }

    // ---------- Çatdırılmalar ----------

    private static async Task SeedDeliveriesAsync(
        AppDbContext context, List<SalesOrder> salesOrders, List<Employee> employees,
        DateOnly monthStart, DateOnly today)
    {
        var vehicles = await context.Vehicles.ToListAsync();
        var drivers = await context.Drivers.ToListAsync();
        if (vehicles.Count == 0 || drivers.Count == 0) return;

        var customers = await context.Customers.ToDictionaryAsync(c => c.Id, c => c.Name);
        var seq = await NextSequenceAsync(context.Deliveries.Select(d => d.Number), "DLV-");

        var destinations = new (string City, string Address)[]
        {
            ("Sumqayıt", "Sumqayıt, 18-ci məhəllə"),
            ("Gəncə", "Gəncə, Nizami küç. 45"),
            ("Şirvan", "Şirvan, Heydər Əliyev pr. 12"),
            ("Quba", "Quba, Ardıc küç. 8"),
            ("Mingəçevir", "Mingəçevir, Sahil küç. 23"),
            ("Bakı", "Bakı, Xətai r., Babək pr. 88"),
            ("Lənkəran", "Lənkəran, Mərkəzi küç. 5"),
            ("Şəki", "Şəki, M.Ə.Rəsulzadə küç. 31"),
        };

        var deliveries = new List<Delivery>();

        // Təsdiqlənmiş sifarişlərin bir hissəsi üçün çatdırılma yaradılır
        foreach (var order in salesOrders.Where(o => o.Status == SalesOrderStatus.Confirmed)
                                         .OrderBy(_ => Rnd.Next()).Take(55))
        {
            var dest = RandomOf(destinations);
            var scheduled = order.OrderDate.AddDays(Rnd.Next(1, 5));
            if (scheduled > today.AddDays(10)) continue;

            var status = scheduled < today.AddDays(-2)
                ? (Rnd.NextDouble() < 0.93 ? DeliveryStatus.Delivered : DeliveryStatus.Cancelled)
                : scheduled <= today
                    ? DeliveryStatus.InTransit
                    : DeliveryStatus.Planned;

            var startedAt = status is DeliveryStatus.Delivered or DeliveryStatus.InTransit
                ? scheduled.ToDateTime(new TimeOnly(Rnd.Next(7, 11), 0)).ToUniversalTime()
                : (DateTime?)null;

            deliveries.Add(new Delivery
            {
                Number = $"DLV-{seq++:D5}",
                CustomerName = customers.GetValueOrDefault(order.CustomerId, "Müştəri"),
                FromAddress = "Bakı, Sabunçu qəs., Mərkəzi anbar",
                ToAddress = dest.Address,
                ScheduledDate = scheduled,
                CargoDescription = $"{order.Number} sifarişi üzrə mal ({order.Items.Count} mövqe)",
                CargoWeightKg = Math.Round((decimal)(Rnd.NextDouble() * 1800 + 120), 1),
                VehicleId = RandomOf(vehicles).Id,
                DriverId = RandomOf(drivers).Id,
                Status = status,
                StartedAtUtc = startedAt,
                DeliveredAtUtc = status == DeliveryStatus.Delivered && startedAt is not null
                    ? startedAt.Value.AddHours(Rnd.Next(3, 9))
                    : null,
                Note = status == DeliveryStatus.Cancelled ? "Müştəri sifarişi ləğv etdi" : null
            });
        }

        context.Deliveries.AddRange(deliveries);
        await context.SaveChangesAsync();
    }

    // ---------- HR aktivliyi ----------

    private static async Task SeedHrActivityAsync(AppDbContext context, List<Employee> employees, DateOnly today)
    {
        var schedules = await context.WorkSchedules.ToListAsync();
        var attendances = new List<Attendance>();

        var existingKeys = (await context.Attendances
            .Select(a => new { a.EmployeeId, a.Date }).ToListAsync())
            .Select(a => (a.EmployeeId, a.Date)).ToHashSet();

        // Son 45 günün davamiyyəti — hər işçinin öz qrafikinə uyğun
        foreach (var emp in employees)
        {
            var schedule = schedules.FirstOrDefault(s => s.Id == emp.WorkScheduleId);

            for (var d = today.AddDays(-45); d <= today; d = d.AddDays(1))
            {
                if (!IsWorkDay(schedule, d.DayOfWeek)) continue;
                if (existingKeys.Contains((emp.Id, d))) continue;

                var roll = Rnd.NextDouble();
                var status = roll switch
                {
                    < 0.88 => AttendanceStatus.Present,
                    < 0.95 => AttendanceStatus.Late,
                    < 0.98 => AttendanceStatus.OnLeave,
                    _ => AttendanceStatus.Absent
                };

                var startHour = schedule?.StartTime.Hour ?? 9;
                TimeOnly? checkIn = status switch
                {
                    AttendanceStatus.Present => new TimeOnly(startHour, Rnd.Next(0, 10)),
                    AttendanceStatus.Late => new TimeOnly(startHour, Rnd.Next(16, 55)),
                    _ => null
                };
                TimeOnly? checkOut = checkIn is null
                    ? null
                    : new TimeOnly(schedule?.EndTime.Hour ?? 18, Rnd.Next(0, 30));

                attendances.Add(new Attendance
                {
                    EmployeeId = emp.Id,
                    Date = d,
                    CheckIn = checkIn,
                    CheckOut = checkOut,
                    Status = status,
                    Note = status == AttendanceStatus.Late ? "Nəqliyyat gecikməsi" : null
                });
            }
        }

        context.Attendances.AddRange(attendances);
        await context.SaveChangesAsync();

        await SeedLeaveRequestsAsync(context, employees, today);
    }

    private static async Task SeedLeaveRequestsAsync(AppDbContext context, List<Employee> employees, DateOnly today)
    {
        if (await context.LeaveRequests.CountAsync() >= 10) return;

        var reasons = new[]
        {
            "Ailəvi səbəb", "İllik istirahət", "Səhhətlə bağlı", "Şəxsi işlər",
            "Uşağın məktəb tədbiri", "Toy mərasimi", "Səfər",
        };

        var requests = new List<LeaveRequest>();
        foreach (var emp in employees.OrderBy(_ => Rnd.Next()).Take(16))
        {
            var start = today.AddDays(Rnd.Next(-120, 25));
            var end = start.AddDays(Rnd.Next(1, 9));

            // Gələcək sorğular gözləmədə — dashboard xəbərdarlığı üçün
            var status = start > today
                ? LeaveStatus.Pending
                : RandomOf(LeaveStatus.Approved, LeaveStatus.Approved, LeaveStatus.Approved, LeaveStatus.Rejected);

            requests.Add(new LeaveRequest
            {
                EmployeeId = emp.Id,
                Type = RandomOf(LeaveType.Annual, LeaveType.Annual, LeaveType.Sick, LeaveType.Unpaid),
                StartDate = start,
                EndDate = end,
                Reason = RandomOf(reasons),
                Status = status,
                DecidedAtUtc = status == LeaveStatus.Pending
                    ? null
                    : start.ToDateTime(TimeOnly.MinValue).AddDays(-2).ToUniversalTime(),
                DecisionNote = status == LeaveStatus.Rejected ? "Həmin dövrdə iş yükü yüksəkdir" : null
            });
        }

        context.LeaveRequests.AddRange(requests);
        await context.SaveChangesAsync();
    }

    private static bool IsWorkDay(WorkSchedule? s, DayOfWeek dow)
    {
        if (s is null) return dow is not (DayOfWeek.Saturday or DayOfWeek.Sunday);
        return dow switch
        {
            DayOfWeek.Monday => s.Monday,
            DayOfWeek.Tuesday => s.Tuesday,
            DayOfWeek.Wednesday => s.Wednesday,
            DayOfWeek.Thursday => s.Thursday,
            DayOfWeek.Friday => s.Friday,
            DayOfWeek.Saturday => s.Saturday,
            DayOfWeek.Sunday => s.Sunday,
            _ => false
        };
    }

    // ---------- Köməkçilər ----------

    /// <summary>"SO-00042" kimi nömrələrdən növbəti sıra nömrəsini tapır.</summary>
    private static async Task<int> NextSequenceAsync(IQueryable<string> numbers, string prefix)
    {
        var existing = await numbers.ToListAsync();
        var max = existing
            .Where(n => n.StartsWith(prefix))
            .Select(n => int.TryParse(n[prefix.Length..], out var v) ? v : 0)
            .DefaultIfEmpty(0)
            .Max();
        return max + 1;
    }

    /// <summary>Siyahıdan təkrarsız n element seçir.</summary>
    private static List<T> PickDistinct<T>(List<T> source, int n) =>
        source.OrderBy(_ => Rnd.Next()).Take(Math.Min(n, source.Count)).ToList();

    /// <summary>Azərbaycan hərflərini normallaşdırıb müqayisə üçün açar yaradır.</summary>
    private static string Normalize(string s) => s.ToLowerInvariant()
        .Replace("ə", "e").Replace("ı", "i").Replace("ö", "o").Replace("ü", "u")
        .Replace("ğ", "g").Replace("ş", "s").Replace("ç", "c").Replace("İ", "i")
        .Replace("Ə", "e").Trim();

    /// <summary>Email/domen üçün latın transliterasiyası.</summary>
    private static string Translit(string s) => Normalize(s)
        .Replace(" ", "").Replace("\"", "").Replace(",", "").Replace(".", "");

    private static T RandomOf<T>(params T[] items) => items[Rnd.Next(items.Length)];

    // List üçün ayrıca overload — params variantı siyahını tək element kimi qəbul edərdi
    private static T RandomOf<T>(List<T> items) => items[Rnd.Next(items.Count)];
}
