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
import { PageHeader, StatCard, EmptyState } from '../../components/ui';
import { Card, InvoiceStatusBadge, fmtMoney, fmtDate, fmtMonth } from './financeShared';

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

// Kateqoriya xərci sətri — ad + məbləğ + nisbət zolağı.
function CategoryRow({ name, amount, max }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="truncate font-medium text-slate-700">{name}</span>
        <span className="shrink-0 tabular-nums font-semibold text-slate-800">
          {fmtMoney(amount)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: EXPENSE_ORANGE }}
        />
      </div>
    </li>
  );
}

export default function FinanceDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/finance/overview')
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message ?? 'İcmal məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  const unpaid = data?.unpaidInvoices ?? {};
  const overdue = data?.overdueInvoices ?? {};
  const cashflow = data?.cashflow ?? [];
  const expenseByCategory = data?.expenseByCategory ?? [];
  const upcomingInvoices = data?.upcomingInvoices ?? [];
  const recentTransactions = data?.recentTransactions ?? [];
  const maxCategory = Math.max(...expenseByCategory.map((c) => c.amount), 0);
  const hasCashflow = cashflow.some((m) => (m.income ?? 0) > 0 || (m.expense ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title="Maliyyə — İcmal"
        description="Gəlir-xərc balansı, pul axını və fakturaların ümumi mənzərəsi"
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Əsas göstəricilər */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon="📈"
          accent="emerald"
          value={fmtMoney(data?.monthIncome)}
          label="Bu ay gəlir"
          sub={
            <Link to="/finance/transactions" className="text-indigo-600 hover:underline">
              Əməliyyatlara bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="📉"
          accent="amber"
          value={fmtMoney(data?.monthExpense)}
          label="Bu ay xərc"
          sub={
            <Link to="/finance/budgets" className="text-indigo-600 hover:underline">
              Büdcəyə bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="💰"
          accent={(data?.monthProfit ?? 0) >= 0 ? 'indigo' : 'rose'}
          value={fmtMoney(data?.monthProfit)}
          label="Bu ay mənfəət"
          sub={(data?.monthProfit ?? 0) >= 0 ? 'Gəlir − xərc balansı' : 'Xərclər gəliri üstələyir'}
        />
        <StatCard
          loading={loading}
          icon="🧾"
          accent="sky"
          value={unpaid.count ?? 0}
          label="Ödənilməmiş faktura"
          sub={`Qalıq: ${fmtMoney(unpaid.amount)}`}
        />
        <StatCard
          loading={loading}
          icon="⏰"
          accent={(overdue.count ?? 0) > 0 ? 'rose' : 'slate'}
          value={overdue.count ?? 0}
          label="Vaxtı keçmiş faktura"
          sub={
            (overdue.count ?? 0) > 0 ? (
              <span className="text-red-600 font-medium">
                Gecikən qalıq: {fmtMoney(overdue.amount)}
              </span>
            ) : (
              'Gecikən faktura yoxdur'
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Pul axını qrafiki */}
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
              <BarChart data={cashflow} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
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
                  formatter={(value) => (
                    <span className="text-sm text-slate-600">{value}</span>
                  )}
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

        {/* Bu ayın xərcləri — kateqoriyalar üzrə */}
        <Card
          title="Bu ayın xərcləri"
          icon="💸"
          action={
            <Link to="/finance/categories" className="text-xs font-medium text-indigo-600 hover:underline">
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
                <CategoryRow key={c.name} name={c.name} amount={c.amount} max={maxCategory} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Vaxtı yaxınlaşan fakturalar */}
        <Card
          title="⏰ Vaxtı yaxınlaşan fakturalar — 7 gün içində"
          icon="🧾"
          action={
            <Link to="/finance/invoices" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={4} />
          ) : upcomingInvoices.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Yaxınlaşan faktura yoxdur"
              description="Növbəti 7 gün ərzində son tarixi çatan faktura yoxdur."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    to={`/finance/invoices/${inv.id}`}
                    className="group flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        <span className="font-mono group-hover:text-indigo-600 transition-colors">
                          {inv.number}
                        </span>
                        <span className="text-slate-400"> • </span>
                        {inv.customerName}
                      </p>
                      <p className="text-xs text-slate-400">
                        Son tarix: {fmtDate(inv.dueDate)}
                      </p>
                    </div>
                    <span className="tabular-nums text-sm font-semibold text-slate-800">
                      {fmtMoney(inv.remainingAmount)}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Son əməliyyatlar */}
        <Card
          title="Son əməliyyatlar"
          icon="🕘"
          action={
            <Link to="/finance/transactions" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={6} />
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon="💵"
              title="Əməliyyat yoxdur"
              description="Hələ heç bir gəlir və ya xərc qeydə alınmayıb."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {t.categoryName}
                      {t.description && (
                        <span className="text-slate-400"> • {t.description}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDate(t.date)}</p>
                  </div>
                  <span
                    className={`tabular-nums text-sm font-semibold ${
                      t.type === 1 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {t.type === 1 ? '+' : '−'}{fmtMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
