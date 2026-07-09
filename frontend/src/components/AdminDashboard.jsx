import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';

// dataviz palitrası (dark surface üçün validasiya edilib: ΔE 97.3, kontrast ≥3:1)
const COLOR_INCOME = '#3987e5';
const COLOR_EXPENSE = '#d95926';

const MONTH_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

const formatMonth = (m) => {
  const [year, month] = m.split('-');
  return `${MONTH_SHORT[Number(month) - 1]} ${year.slice(2)}`;
};

const fmt = (v) => `${Number(v).toLocaleString()} ₼`;

function KpiTile({ label, value, accent }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return null;

  const chartData = data.monthlyFinance.map((p) => ({
    month: formatMonth(p.month),
    Gəlir: p.income,
    Xərc: p.expense,
  }));

  const maxExpense = Math.max(...data.expenseByCategory.map((c) => c.amount), 1);

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-white mb-4">📊 İdarəetmə paneli</h2>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Bu ay gəlir" value={fmt(data.monthIncome)} accent="text-emerald-400" />
        <KpiTile label="Bu ay xərc" value={fmt(data.monthExpense)} accent="text-orange-400" />
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
          accent={data.lowStockCount > 0 ? 'text-red-400' : 'text-white'}
        />
        <KpiTile
          label="Gözləyən məzuniyyət"
          value={data.pendingLeaveCount}
          accent={data.pendingLeaveCount > 0 ? 'text-yellow-400' : 'text-white'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aylıq gəlir/xərc */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Son 6 ay — gəlir və xərc
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid stroke="#334155" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={70}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(value) => fmt(value)}
                contentStyle={{
                  background: '#0f172a', border: '1px solid #334155',
                  borderRadius: 8, color: '#f1f5f9',
                }}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 13 }} />
              <Bar dataKey="Gəlir" fill={COLOR_INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Xərc" fill={COLOR_EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Xərclər kateqoriya üzrə */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Bu ayın xərcləri — kateqoriya üzrə
          </h3>
          {data.expenseByCategory.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Bu ay xərc qeydi yoxdur.</p>
          ) : (
            <ul className="space-y-3">
              {data.expenseByCategory.map((c) => (
                <li key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{c.name}</span>
                    <span className="text-slate-400 font-medium">{fmt(c.amount)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.amount / maxExpense) * 100}%`,
                        background: COLOR_EXPENSE,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
