// Sistemin modulları. `key` backend-dəki AppModule enum adları ilə üst-üstə düşməlidir.
export const MODULES = [
  {
    key: 'Hr',
    label: 'İnsan Resursları',
    icon: '👥',
    description: 'İşçilər, şöbələr, davamiyyət və məzuniyyətlər',
    path: '/hr',
    basePath: '/hr',
    ready: true,
    nav: [
      { to: '/hr', label: 'İcmal', icon: '🏠' },
      { to: '/hr/employees', label: 'İşçilər', icon: '👥' },
      { to: '/hr/departments', label: 'Şöbələr', icon: '🏢' },
      { to: '/hr/positions', label: 'Vəzifələr', icon: '💼' },
      { to: '/hr/attendance', label: 'Davamiyyət', icon: '🕘' },
      { to: '/hr/leave-requests', label: 'Məzuniyyət', icon: '🌴' },
      { to: '/hr/schedules', label: 'İş qrafikləri', icon: '🗓️' },
    ],
  },
  {
    key: 'Inventory',
    label: 'Anbar',
    icon: '📦',
    description: 'Məhsullar, stok hərəkətləri və anbarlar arası transferlər',
    path: '/inventory',
    basePath: '/inventory',
    ready: true,
    nav: [
      { to: '/inventory', label: 'İcmal', icon: '🏠' },
      { to: '/inventory/products', label: 'Məhsullar', icon: '📦' },
      { to: '/inventory/categories', label: 'Kateqoriyalar', icon: '🏷️' },
      { to: '/inventory/warehouses', label: 'Anbarlar', icon: '🏭' },
      { to: '/inventory/stock', label: 'Stok', icon: '📈' },
    ],
  },
  {
    key: 'Transport',
    label: 'Nəqliyyat',
    icon: '🚚',
    description: 'Avtomobillər, sürücülər, çatdırılma və yanacaq qeydləri',
    path: '/transport',
    basePath: '/transport',
    ready: true,
    nav: [
      { to: '/transport', label: 'İcmal', icon: '🏠' },
      { to: '/transport/deliveries', label: 'Çatdırılmalar', icon: '🚚' },
      { to: '/transport/vehicles', label: 'Avtomobillər', icon: '🚛' },
      { to: '/transport/gps', label: 'GPS izləmə', icon: '📍' },
      { to: '/transport/drivers', label: 'Sürücülər', icon: '🧑‍✈️' },
      { to: '/transport/fuel', label: 'Yanacaq köçürməsi', icon: '⛽' },
      { to: '/transport/logs', label: 'Yanacaq / Təmir', icon: '🔧' },
    ],
  },
  {
    key: 'Finance',
    label: 'Maliyyə',
    icon: '💰',
    description: 'Gəlir-xərc, büdcə, fakturalar və ödənişlər',
    path: '/finance',
    basePath: '/finance',
    ready: true,
    nav: [
      { to: '/finance', label: 'İcmal', icon: '🏠' },
      { to: '/finance/transactions', label: 'Gəlir / Xərc', icon: '💵' },
      { to: '/finance/invoices', label: 'Fakturalar', icon: '🧾' },
      { to: '/finance/budgets', label: 'Büdcə', icon: '🎯' },
      { to: '/finance/categories', label: 'Kateqoriyalar', icon: '🏷️' },
    ],
  },
  {
    key: 'Sales',
    label: 'Satış və Müştərilər',
    icon: '🤝',
    description: 'Müştərilər, təchizatçılar, alış-satış sifarişləri',
    path: '/sales',
    basePath: '/sales',
    ready: true,
    nav: [
      { to: '/sales', label: 'İcmal', icon: '🏠' },
      { to: '/sales/sales-orders', label: 'Satış sifarişləri', icon: '📤' },
      { to: '/sales/purchase-orders', label: 'Alış sifarişləri', icon: '📥' },
      { to: '/sales/customers', label: 'Müştərilər', icon: '🤝' },
      { to: '/sales/suppliers', label: 'Təchizatçılar', icon: '🏗️' },
    ],
  },
  {
    key: 'Reports',
    label: 'Hesabatlar',
    icon: '📑',
    description: 'Excel export və import — bütün modullar üzrə',
    path: '/reports',
    basePath: '/reports',
    ready: true,
    nav: [
      { to: '/reports', label: 'Hesabatlar', icon: '📑' },
    ],
  },
];

MODULES.push({
  key: 'Ai',
  label: 'AI Köməkçi',
  icon: '🤖',
  description: 'ERP məlumatları əsasında təhlil, tövsiyə və cavablar',
  path: '/ai',
  basePath: '/ai',
  ready: true,
  nav: [
    { to: '/ai', label: 'AI Köməkçi', icon: '🤖' },
  ],
});

MODULES.push({
  key: 'Management',
  label: 'İdarəetmə paneli',
  icon: '📊',
  description: 'Statistika, KPI göstəriciləri və sistem logları',
  path: '/management/statistics',
  basePath: '/management',
  ready: true,
  adminOnly: true, // yalnız SuperAdmin/Admin görür, işçilərə icazə kimi verilmir
  nav: [
    { to: '/management/statistics', label: 'Statistika', icon: '📊' },
    { to: '/management/logs', label: 'Log mərkəzi', icon: '📜' },
  ],
});

export const findModuleByPath = (pathname) =>
  MODULES.find((m) => pathname.startsWith(m.basePath));
