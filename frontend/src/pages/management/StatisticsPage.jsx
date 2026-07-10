import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';

// dataviz palitrası (light surface üçün validasiya olunmuş dəst)
const COLOR_INCOME = '#2a78d6';
const COLOR_EXPENSE = '#eb6834';

const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

const formatMonth = (m) => {
  const [year, month] = m.split('-');
  return `${MONTH_SHORT[Number(month) - 1]} ${year.slice(2)}`;
};

const fmt = (v) => `${Number(v).toLocaleString()} ₼`;

function KpiTile({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow px-5 py-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

export default function StatisticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-slate-400">Yüklənir...</p>;

  const chartData = data.monthlyFinance.map((p) => ({
    month: formatMonth(p.month),
    Gəlir: p.income,
    Xərc: p.expense,
  }));

  const maxExpense = Math.max(...data.expenseByCategory.map((c) => c.amount), 1);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Statistika</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Bu ay gəlir" value={fmt(data.monthIncome)} accent="text-emerald-600" />
        <KpiTile label="Bu ay xərc" value={fmt(data.monthExpense)} accent="text-orange-600" />
        <KpiTile
          label="Ödənilməmiş fakturalar"
          value={`${data.unpaidInvoiceCount} ədəd · ${fmt(data.unpaidInvoiceAmount)}`}
        />
        <KpiTile label="Yolda olan çatdırılma" value={data.activeDeliveryCount} />
        <KpiTile label="İşçilər" value={data.employeeCount} />
        <KpiTile label="Məhsullar" value={data.productCount} />
        <KpiTile
          label="Az stoklu məhsul"
          value={data.lowStockCount}
          accent={data.lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}
        />
        <KpiTile
          label="Gözləyən məzuniyyət"
          value={data.pendingLeaveCount}
          accent={data.pendingLeaveCount > 0 ? 'text-yellow-600' : 'text-slate-800'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Son 6 ay — gəlir və xərc</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={70}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(value) => fmt(value)}
                contentStyle={{
                  background: '#ffffff', border: '1px solid #e2e8f0',
                  borderRadius: 8, color: '#0f172a',
                }}
                cursor={{ fill: 'rgba(100,116,139,0.08)' }}
              />
              <Legend wrapperStyle={{ color: '#475569', fontSize: 13 }} />
              <Bar dataKey="Gəlir" fill={COLOR_INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Xərc" fill={COLOR_EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Bu ayın xərcləri — kateqoriya üzrə</h3>
          {data.expenseByCategory.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Bu ay xərc qeydi yoxdur.</p>
          ) : (
            <ul className="space-y-3">
              {data.expenseByCategory.map((c) => (
                <li key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{c.name}</span>
                    <span className="text-slate-500 font-medium">{fmt(c.amount)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.amount / maxExpense) * 100}%`, background: COLOR_EXPENSE }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
