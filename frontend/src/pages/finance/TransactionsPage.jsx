import { notify } from '../../notify';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const METHODS = { 1: 'Nağd', 2: 'Kart', 3: 'Bank köçürməsi' };

export default function TransactionsPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, watch } = useForm();
  const selectedType = watch('type');

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (typeFilter) params.type = typeFilter;
    api.get('/finance/transactions', { params }).then(({ data }) => setResult(data));
    api.get('/finance/summary').then(({ data }) => setSummary(data));
  }, [page, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCategories = () =>
    api.get('/finance/categories').then(({ data }) => setCategories(data));

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    reset({
      type: '2', categoryId: '', date: new Date().toISOString().slice(0, 10),
      amount: '', method: '1', description: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/finance/transactions', {
        type: Number(values.type),
        categoryId: Number(values.categoryId),
        date: values.date,
        amount: Number(values.amount),
        method: Number(values.method),
        description: values.description || null,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.errors
          ? Object.values(data.errors).flat().join(' ')
          : data?.message ?? 'Xəta baş verdi.'
      );
    }
  };

  const onDelete = async (t) => {
    if (!confirm('Bu əməliyyatı silmək istədiyinizə əminsiniz?')) return;
    try {
      await api.delete(`/finance/transactions/${t.id}`);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    }
  };

  const filteredCategories = categories.filter(
    (c) => !selectedType || c.type === Number(selectedType)
  );

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gəlir və Xərclər</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni əməliyyat
        </button>
      </div>

      {/* Xülasə kartları */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500 mb-1">Ümumi gəlir</p>
            <p className="text-2xl font-bold text-green-600">
              {summary.totalIncome.toLocaleString()} ₼
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500 mb-1">Ümumi xərc</p>
            <p className="text-2xl font-bold text-red-600">
              {summary.totalExpense.toLocaleString()} ₼
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500 mb-1">Mənfəət</p>
            <p className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
              {summary.profit.toLocaleString()} ₼
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">Hamısı</option>
          <option value="1">Gəlirlər</option>
          <option value="2">Xərclər</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Tarix</th>
              <th className="text-left px-6 py-3 font-semibold">Tip</th>
              <th className="text-left px-6 py-3 font-semibold">Kateqoriya</th>
              <th className="text-right px-6 py-3 font-semibold">Məbləğ</th>
              <th className="text-left px-6 py-3 font-semibold">Üsul</th>
              <th className="text-left px-6 py-3 font-semibold">Təsvir</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 whitespace-nowrap">{t.date}</td>
                <td className="px-6 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.type === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {t.type === 1 ? 'Gəlir' : 'Xərc'}
                  </span>
                </td>
                <td className="px-6 py-3">{t.categoryName}</td>
                <td className={`px-6 py-3 text-right font-semibold ${
                  t.type === 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {t.type === 1 ? '+' : '−'}{t.amount.toLocaleString()} ₼
                </td>
                <td className="px-6 py-3">{METHODS[t.method] ?? t.method}</td>
                <td className="px-6 py-3 text-slate-500 max-w-56 truncate" title={t.description}>
                  {t.description || '—'}
                  {t.invoiceNumber && (
                    <span className="ml-1 text-xs text-blue-600">({t.invoiceNumber})</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  {!t.invoiceNumber && (
                    <button onClick={() => onDelete(t)} className="text-red-600 hover:underline">
                      Sil
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  Əməliyyat tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} əməliyyat</span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
          >
            ← Əvvəlki
          </button>
          <span>Səhifə {result.page} / {Math.max(result.totalPages, 1)}</span>
          <button
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
          >
            Növbəti →
          </button>
        </div>
      </div>

      <Modal open={modalOpen} title="Yeni əməliyyat" onClose={() => setModalOpen(false)}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tip *</label>
              <select className={inputCls} {...register('type', { required: true })}>
                <option value="1">Gəlir</option>
                <option value="2">Xərc</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Kateqoriya *</label>
              <select className={inputCls} {...register('categoryId', { required: true })}>
                <option value="">Seçin...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Tarix *</label>
              <input type="date" className={inputCls} {...register('date', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Məbləğ (₼) *</label>
              <input type="number" step="0.01" className={inputCls} {...register('amount', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Üsul *</label>
              <select className={inputCls} {...register('method', { required: true })}>
                {Object.entries(METHODS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Təsvir</label>
            <input className={inputCls} {...register('description')} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
