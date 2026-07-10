const ACCENTS = {
  indigo: 'from-indigo-500/10 to-blue-500/5 text-indigo-600',
  emerald: 'from-emerald-500/10 to-teal-500/5 text-emerald-600',
  amber: 'from-amber-500/10 to-orange-500/5 text-amber-600',
  sky: 'from-sky-500/10 to-cyan-500/5 text-sky-600',
  rose: 'from-rose-500/10 to-pink-500/5 text-rose-600',
  slate: 'from-slate-500/10 to-slate-400/5 text-slate-600',
};

export default function StatCard({ icon, label, value, sub, accent = 'indigo', loading = false }) {
  const accentCls = ACCENTS[accent] ?? ACCENTS.indigo;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm p-5 animate-pulse">
        <div className="h-10 w-10 rounded-xl bg-slate-200 mb-4" />
        <div className="h-7 w-16 rounded bg-slate-200 mb-2" />
        <div className="h-3.5 w-24 rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow p-5">
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accentCls} opacity-70 blur-2xl pointer-events-none`}
      />
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accentCls} text-lg mb-3`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
