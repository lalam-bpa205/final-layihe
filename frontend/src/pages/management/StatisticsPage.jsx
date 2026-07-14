import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { PageHeader, StatCard, Avatar, EmptyState } from '../../components/ui';
import {
  Card,
  actionLabel,
  entityLabel,
  moduleLabel,
  fmtMoney,
  fmtMonth,
  fmtNumber,
  timeAgo,
} from './managementShared';

// dataviz palitrası (light surface üçün validasiya olunmuş)
const INCOME_BLUE = '#2a78d6';
const EXPENSE_ORANGE = '#eb6834';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs text-slate-500">{fmtMonth(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-800 tabular-nums">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
            aria-hidden="true"
          />
          {p.name}: <b>{fmtMoney(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="h-3.5 w-40 rounded bg-slate-200" />
          <div className="h-3.5 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// Nisbət zolağı olan siyahı sətri (xərc kateqoriyası / modul aktivliyi).
function MeterRow({ name, valueText, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="truncate font-medium text-slate-700">{name}</span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-800">{valueText}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </li>
  );
}

// Əməliyyat KPI-ları üçün kiçik kart.
const MINI_TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  teal: 'bg-teal-50 text-teal-600',
  slate: 'bg-slate-100 text-slate-600',
};

function MiniStat({ icon, label, value, tone = 'slate', to, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="mb-3 h-8 w-8 rounded-lg bg-slate-200" />
        <div className="mb-1.5 h-5 w-10 rounded bg-slate-200" />
        <div className="h-3 w-20 rounded bg-slate-100" />
      </div>
    );
  }

  const body = (
    <>
      <span
        className={`mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-base ${
          MINI_TONES[tone] ?? MINI_TONES.slate
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="text-xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </>
  );

  const cls =
    'block rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md';

  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// Xəbərdarlıq zolağının kartı.
const ALERT_TONES = {
  rose: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300',
};

function AlertCard({ icon, title, value, sub, tone, to }) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm transition-colors ${
        ALERT_TONES[tone] ?? ALERT_TONES.slate
      }`}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
        {sub && <p className="text-xs opacity-80">{sub}</p>}
      </div>
      <span className="text-sm opacity-0 transition-opacity group-hover:opacity-70" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export default function StatisticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setData(data))
      .catch((err) =>
        setError(err.response?.data?.message ?? 'İdarəetmə paneli məlumatları yüklənə bilmədi.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const monthIncome = data?.monthIncome ?? 0;
  const monthExpense = data?.monthExpense ?? 0;
  const monthProfit = monthIncome - monthExpense;

  const monthlyFinance = data?.monthlyFinance ?? [];
  const expenseByCategory = data?.expenseByCategory ?? [];
  const modulesActivity = data?.modulesActivity ?? [];
  const topUsers = data?.topUsers ?? [];
  const recentActivity = data?.recentActivity ?? [];

  const overdueInvoiceCount = data?.overdueInvoiceCount ?? 0;
  const lowStockCount = data?.lowStockCount ?? 0;
  const pendingLeaveCount = data?.pendingLeaveCount ?? 0;
  const pendingOrdersCount = data?.pendingOrdersCount ?? 0;
  const hasAlerts =
    overdueInvoiceCount > 0 || lowStockCount > 0 || pendingLeaveCount > 0 || pendingOrdersCount > 0;

  const maxCategory = Math.max(...expenseByCategory.map((c) => c.amount ?? 0), 0);
  const maxModule = Math.max(...modulesActivity.map((m) => m.recordCount ?? 0), 0);
  const maxUserActions = Math.max(...topUsers.map((u) => u.actionCount ?? 0), 0);
  const hasCashflow = monthlyFinance.some((m) => (m.income ?? 0) > 0 || (m.expense ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title="İdarəetmə paneli"
        description="Bütün modullar üzrə vahid mənzərə — maliyyə, əməliyyat və sistem aktivliyi"
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 1. Maliyyə KPI-ları */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          icon="📈"
          accent="emerald"
          value={fmtMoney(monthIncome)}
          label="Bu ay gəlir"
          sub="Maliyyə əməliyyatları üzrə"
        />
        <StatCard
          loading={loading}
          icon="📉"
          accent="amber"
          value={fmtMoney(monthExpense)}
          label="Bu ay xərc"
          sub="Bütün kateqoriyalar üzrə"
        />
        <StatCard
          loading={loading}
          icon="💰"
          accent={monthProfit >= 0 ? 'indigo' : 'rose'}
          value={fmtMoney(monthProfit)}
          label="Bu ay mənfəət"
          sub={
            monthProfit >= 0 ? (
              'Gəlir − xərc balansı'
            ) : (
              <span className="font-medium text-rose-600">Xərclər gəliri üstələyir</span>
            )
          }
        />
        <StatCard
          loading={loading}
          icon="🏬"
          accent="sky"
          value={fmtMoney(data?.totalStockValue)}
          label="Ümumi stok dəyəri"
          sub="Alış qiyməti ilə"
        />
      </div>

      {/* 2. Xəbərdarlıq zolağı */}
      {loading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[86px] animate-pulse rounded-2xl border border-slate-200/60 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : hasAlerts ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overdueInvoiceCount > 0 && (
            <AlertCard
              icon="⚠️"
              tone="rose"
              title="Vaxtı keçmiş fakturalar"
              value={`${fmtNumber(overdueInvoiceCount)} ədəd`}
              sub={`Gecikən qalıq: ${fmtMoney(data?.overdueInvoiceAmount)}`}
              to="/finance/invoices"
            />
          )}
          {lowStockCount > 0 && (
            <AlertCard
              icon="📦"
              tone="amber"
              title="Az stoklu məhsul"
              value={`${fmtNumber(lowStockCount)} məhsul`}
              sub="Minimum stok həddindən aşağı"
              to="/inventory/products"
            />
          )}
          {pendingLeaveCount > 0 && (
            <AlertCard
              icon="🌴"
              tone="sky"
              title="Gözləyən məzuniyyət"
              value={`${fmtNumber(pendingLeaveCount)} sorğu`}
              sub="Təsdiq gözləyir"
              to="/hr/leave-requests"
            />
          )}
          {pendingOrdersCount > 0 && (
            <AlertCard
              icon="🧾"
              tone="slate"
              title="Gözləyən sifariş"
              value={`${fmtNumber(pendingOrdersCount)} sifariş`}
              sub="Emal gözləyir"
              to="/sales/sales-orders"
            />
          )}
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <span className="text-lg" aria-hidden="true">
            ✅
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Diqqət tələb edən problem yoxdur
            </p>
            <p className="text-xs text-emerald-700/80">
              Gecikən faktura, az stok, gözləyən məzuniyyət və ya sifariş qeydə alınmayıb.
            </p>
          </div>
        </div>
      )}

      {/* 3. Pul axını + xərc kateqoriyaları */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Pul axını (son 6 ay)" icon="📊" className="xl:col-span-2">
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-slate-100" />
          ) : !hasCashflow ? (
            <EmptyState
              icon="📊"
              title="Məlumat yoxdur"
              description="Son 6 ayda gəlir və ya xərc əməliyyatı qeydə alınmayıb."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlyFinance}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                barGap={2}
              >
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={fmtMonth}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(val) => Number(val).toLocaleString('az-AZ')}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Legend
                  formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="income"
                  name="Gəlir"
                  fill={INCOME_BLUE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expense"
                  name="Xərc"
                  fill={EXPENSE_ORANGE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card
          title="Bu ayın xərcləri — kateqoriya üzrə"
          icon="💸"
          action={
            <Link
              to="/finance/categories"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Kateqoriyalar →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={5} />
          ) : expenseByCategory.length === 0 ? (
            <EmptyState
              icon="💸"
              title="Xərc yoxdur"
              description="Bu ay hələ xərc əməliyyatı qeydə alınmayıb."
            />
          ) : (
            <ul>
              {expenseByCategory.map((c) => (
                <MeterRow
                  key={c.name}
                  name={c.name}
                  value={c.amount ?? 0}
                  max={maxCategory}
                  valueText={fmtMoney(c.amount)}
                  color={EXPENSE_ORANGE}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 4. Əməliyyat KPI-ları */}
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        <MiniStat
          loading={loading}
          icon="👥"
          tone="indigo"
          label="İşçilər"
          value={fmtNumber(data?.employeeCount)}
          to="/hr/employees"
        />
        <MiniStat
          loading={loading}
          icon="📦"
          tone="amber"
          label="Məhsullar"
          value={fmtNumber(data?.productCount)}
          to="/inventory/products"
        />
        <MiniStat
          loading={loading}
          icon="🚚"
          tone="sky"
          label="Avtomobillər"
          value={fmtNumber(data?.vehicleCount)}
          to="/transport/vehicles"
        />
        <MiniStat
          loading={loading}
          icon="🤝"
          tone="emerald"
          label="Müştərilər"
          value={fmtNumber(data?.customerCount)}
          to="/sales/customers"
        />
        <MiniStat
          loading={loading}
          icon="🏭"
          tone="violet"
          label="Təchizatçılar"
          value={fmtNumber(data?.supplierCount)}
          to="/sales/suppliers"
        />
        <MiniStat
          loading={loading}
          icon="🔐"
          tone="slate"
          label="İstifadəçilər"
          value={fmtNumber(data?.userCount)}
        />
        <MiniStat
          loading={loading}
          icon="🛣️"
          tone="rose"
          label="Yolda olan çatdırılma"
          value={fmtNumber(data?.activeDeliveryCount)}
          to="/transport/deliveries"
        />
        <MiniStat
          loading={loading}
          icon="✅"
          tone="teal"
          label="Bu ay çatdırılan"
          value={fmtNumber(data?.monthDeliveredCount)}
          to="/transport/deliveries"
        />
      </div>

      {/* 5. Modul aktivliyi + ən aktiv istifadəçilər */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Modul aktivliyi" icon="🏢">
          {loading ? (
            <ListSkeleton rows={6} />
          ) : modulesActivity.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="Aktivlik yoxdur"
              description="Modullar üzrə qeyd statistikası hələ mövcud deyil."
            />
          ) : (
            <ul>
              {modulesActivity.map((m) => (
                <MeterRow
                  key={m.module}
                  name={moduleLabel(m.module)}
                  value={m.recordCount ?? 0}
                  max={maxModule}
                  valueText={`${fmtNumber(m.recordCount)} qeyd`}
                  color={INCOME_BLUE}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Ən aktiv istifadəçilər (30 gün)" icon="🏆">
          {loading ? (
            <ListSkeleton rows={5} />
          ) : topUsers.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="Aktivlik yoxdur"
              description="Son 30 gündə sistemdə qeydə alınmış əməliyyat yoxdur."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topUsers.map((u, i) => {
                const pct = maxUserActions > 0 ? Math.round(((u.actionCount ?? 0) / maxUserActions) * 100) : 0;
                return (
                  <li key={u.userName} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-slate-400 tabular-nums">
                      {i + 1}
                    </span>
                    <Avatar name={u.userName ?? ''} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{u.userName}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: INCOME_BLUE }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                      {fmtNumber(u.actionCount)}
                      <span className="ml-1 text-xs font-normal text-slate-400">əməliyyat</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* 6. Son sistem aktivliyi */}
      <Card
        title="Son sistem aktivliyi"
        icon="🕘"
        action={
          <Link to="/management/logs" className="text-xs font-medium text-indigo-600 hover:underline">
            Bütün loglara bax →
          </Link>
        }
      >
        {loading ? (
          <ListSkeleton rows={8} />
        ) : recentActivity.length === 0 ? (
          <EmptyState
            icon="🕘"
            title="Aktivlik yoxdur"
            description="Sistemdə hələ heç bir dəyişiklik qeydə alınmayıb."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentActivity.map((log, i) => {
              const a = actionLabel(log.action);
              return (
                <li
                  key={`${log.entityType}-${log.entityId}-${log.createdAtUtc}-${i}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                >
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${a.cls}`}
                  >
                    {a.icon} {a.text}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-slate-800">
                    {entityLabel(log.entityType)}{' '}
                    <span className="font-mono text-slate-400">#{log.entityId}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-500">
                    {log.userName} tərəfindən
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
                    {timeAgo(log.createdAtUtc)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
