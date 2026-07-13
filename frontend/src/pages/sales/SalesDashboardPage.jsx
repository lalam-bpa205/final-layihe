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
import { PageHeader, StatCard, EmptyState, Avatar } from '../../components/ui';
import {
  Card,
  SalesOrderStatusBadge,
  fmtMoney,
  fmtDate,
  fmtMonth,
  SALES_BLUE,
  PURCHASE_ORANGE,
} from './salesShared';

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

export default function SalesDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/sales/overview')
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message ?? 'İcmal məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  const monthSales = data?.monthSales ?? {};
  const monthPurchases = data?.monthPurchases ?? {};
  const trend = data?.monthlyTrend ?? [];
  const topCustomers = data?.topCustomers ?? [];
  const recentOrders = data?.recentSalesOrders ?? [];
  const hasTrend = trend.some((m) => (m.sales ?? 0) > 0 || (m.purchases ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title="Satış — İcmal"
        description="Satış-alış dinamikası, gözləyən sifarişlər və ən aktiv müştərilər"
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Əsas göstəricilər */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon="📤"
          accent="indigo"
          value={fmtMoney(monthSales.amount)}
          label="Bu ay satış"
          sub={`${monthSales.orderCount ?? 0} sifariş · təsdiqlənmiş məbləğ`}
        />
        <StatCard
          loading={loading}
          icon="📥"
          accent="amber"
          value={fmtMoney(monthPurchases.amount)}
          label="Bu ay alış"
          sub={`${monthPurchases.orderCount ?? 0} sifariş · qəbul edilmiş məbləğ`}
        />
        <StatCard
          loading={loading}
          icon="⏳"
          accent={(data?.pendingSalesCount ?? 0) > 0 ? 'sky' : 'slate'}
          value={data?.pendingSalesCount ?? 0}
          label="Gözləyən satış sifarişi"
          sub={
            <Link to="/sales/sales-orders" className="text-indigo-600 hover:underline">
              Satış sifarişlərinə bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="🕓"
          accent={(data?.pendingPurchaseCount ?? 0) > 0 ? 'rose' : 'slate'}
          value={data?.pendingPurchaseCount ?? 0}
          label="Gözləyən alış sifarişi"
          sub={
            <Link to="/sales/purchase-orders" className="text-indigo-600 hover:underline">
              Alış sifarişlərinə bax →
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Satış / Alış trendi */}
        <Card title="Satış / Alış trendi (6 ay)" icon="📊" className="xl:col-span-2">
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-slate-100" />
          ) : !hasTrend ? (
            <EmptyState
              icon="📊"
              title="Məlumat yoxdur"
              description="Son 6 ayda satış və ya alış sifarişi qeydə alınmayıb."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
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
                  dataKey="sales"
                  name="Satış"
                  fill={SALES_BLUE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="purchases"
                  name="Alış"
                  fill={PURCHASE_ORANGE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top müştərilər */}
        <Card
          title="🏆 Top müştərilər"
          icon="🤝"
          action={
            <Link to="/sales/customers" className="text-xs font-medium text-indigo-600 hover:underline">
              Hamısına bax →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={5} />
          ) : topCustomers.length === 0 ? (
            <EmptyState
              icon="🤝"
              title="Müştəri yoxdur"
              description="Təsdiqlənmiş satış sifarişi olan müştəri hələ yoxdur."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topCustomers.map((c) => (
                <li key={c.customerId}>
                  <Link
                    to={`/sales/customers/${c.customerId}`}
                    className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-400">{c.orderCount} sifariş</p>
                    </div>
                    <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-800">
                      {fmtMoney(c.totalAmount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Son satış sifarişləri */}
      <Card
        title="Son satış sifarişləri"
        icon="🕘"
        action={
          <Link to="/sales/sales-orders" className="text-xs font-medium text-indigo-600 hover:underline">
            Hamısına bax →
          </Link>
        }
      >
        {loading ? (
          <ListSkeleton rows={6} />
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon="📤"
            title="Sifariş yoxdur"
            description="Hələ heç bir satış sifarişi yaradılmayıb."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/sales/sales-orders/${o.id}`}
                  className="group flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="font-mono group-hover:text-indigo-600 transition-colors">
                        {o.number}
                      </span>
                      <span className="text-slate-400"> • </span>
                      {o.customerName}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDate(o.orderDate)}</p>
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-slate-800">
                    {fmtMoney(o.totalAmount)}
                  </span>
                  <SalesOrderStatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
