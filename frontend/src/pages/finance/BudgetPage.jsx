import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = useCallback(() => {
    api.get('/finance/budgets', { params: { year, month } })
      .then(({ data }) => setBudgets(data));
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/finance/categories', { params: { type: 2 } })
      .then(({ data }) => setCategories(data));
  }, []);

  const openCreate = () => {
    reset({ categoryId: '', limitAmount: '' });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/finance/budgets', {
        year,
        month,
        categoryId: Number(values.categoryId),
        limitAmount: Number(values.limitAmount),
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const onDelete = async (b) => {
    if (!confirm(`"${b.categoryName}" büdcəsini silmək istədiyinizə əminsiniz?`)) return;
    await api.delete(`/finance/budgets/${b.id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Büdcə</h2>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
          >
            + Büdcə təyin et
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800">{b.categoryName}</h3>
              <button onClick={() => onDelete(b)} className="text-sm text-red-600 hover:underline">
                Sil
              </button>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xl font-bold ${b.isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>
                {b.spentAmount.toLocaleString()} ₼
              </span>
              <span className="text-sm text-slate-500">
                / {b.limitAmount.toLocaleString()} ₼ ({b.usagePercent}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  b.isOverBudget
                    ? 'bg-red-500'
                    : b.usagePercent >= 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(b.usagePercent, 100)}%` }}
              />
            </div>
            {b.isOverBudget && (
              <p className="mt-2 text-sm text-red-600 font-medium">
                ⚠️ Büdcə {(b.spentAmount - b.limitAmount).toLocaleString()} ₼ aşılıb!
              </p>
            )}
          </div>
        ))}
        {budgets.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow p-10 text-center text-slate-400">
            {MONTHS[month - 1]} {year} üçün büdcə təyin edilməyib.
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={`${MONTHS[month - 1]} ${year} — büdcə`}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Xərc kateqoriyası *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('categoryId', { required: true })}
            >
              <option value="">Seçin...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aylıq limit (₼) *</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('limitAmount', { required: true })}
            />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
