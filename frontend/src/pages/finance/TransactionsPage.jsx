import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  StatCard,
  Button,
  Badge,
  Input,
  Select,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';
import { PAYMENT_METHODS, fmtMoney, fmtDate } from './financeShared';

const TYPE_FILTERS = [
  { value: '', label: 'Hamısı' },
  { value: '1', label: 'Gəlirlər' },
  { value: '2', label: 'Xərclər' },
];

export default function TransactionsPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, watch, formState } = useForm();
  const selectedType = watch('type');

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (typeFilter) params.type = typeFilter;
    setLoading(true);
    api
      .get('/finance/transactions', { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('Əməliyyatlar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
    api.get('/finance/summary').then(({ data }) => setSummary(data));
  }, [page, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/finance/categories').then(({ data }) => setCategories(data));
  }, []);

  const openCreate = () => {
    reset({
      type: '2',
      categoryId: '',
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      method: '1',
      description: '',
    });
    setError(null);
    setPanelOpen(true);
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
      setPanelOpen(false);
      notify.success('Əməliyyat qeydə alındı.');
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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/finance/transactions/${pendingDelete.id}`);
      notify.success('Əməliyyat silindi.');
      setPendingDelete(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => !selectedType || c.type === Number(selectedType)
  );

  return (
    <div>
      <PageHeader
        title="Gəlir və Xərclər"
        description="Bütün maliyyə əməliyyatları — gəlirlər, xərclər və ödəniş üsulları"
        actions={<Button onClick={openCreate}>+ Yeni əməliyyat</Button>}
      />

      {/* Xülasə kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          loading={!summary}
          icon="📈"
          accent="emerald"
          value={fmtMoney(summary?.totalIncome)}
          label="Ümumi gəlir"
        />
        <StatCard
          loading={!summary}
          icon="📉"
          accent="amber"
          value={fmtMoney(summary?.totalExpense)}
          label="Ümumi xərc"
        />
        <StatCard
          loading={!summary}
          icon="💰"
          accent={(summary?.profit ?? 0) >= 0 ? 'indigo' : 'rose'}
          value={fmtMoney(summary?.profit)}
          label="Mənfəət"
        />
      </div>

      {/* Filter chip-ləri */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setTypeFilter(f.value); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === f.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tip</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Kateqoriya</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Üsul</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Təsvir</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={7} />
            ) : (
              result.items.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5 whitespace-nowrap tabular-nums text-slate-500">
                    {fmtDate(t.date)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone={t.type === 1 ? 'green' : 'red'}>
                      {t.type === 1 ? 'Gəlir' : 'Xərc'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700">{t.categoryName}</td>
                  <td
                    className={`px-6 py-3.5 text-right tabular-nums font-semibold ${
                      t.type === 1 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {t.type === 1 ? '+' : '−'}{fmtMoney(t.amount)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{PAYMENT_METHODS[t.method] ?? t.method}</td>
                  <td className="px-6 py-3.5 text-slate-500 max-w-56 truncate" title={t.description}>
                    {t.description || '—'}
                    {t.invoiceNumber && (
                      <span className="ml-1 font-mono text-xs text-indigo-600">
                        ({t.invoiceNumber})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    {!t.invoiceNumber && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setPendingDelete(t)}
                      >
                        Sil
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && result.items.length === 0 && (
          <EmptyState
            icon="💵"
            title={typeFilter ? 'Nəticə tapılmadı' : 'Hələ əməliyyat yoxdur'}
            description={
              typeFilter
                ? 'Seçilmiş tipə uyğun əməliyyat tapılmadı.'
                : 'İlk gəlir və ya xərc əməliyyatını əlavə edərək başlayın.'
            }
            action={!typeFilter && <Button onClick={openCreate}>+ Yeni əməliyyat</Button>}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} əməliyyat</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Əvvəlki
          </Button>
          <span className="px-1 tabular-nums">
            Səhifə {result.page} / {Math.max(result.totalPages, 1)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Növbəti →
          </Button>
        </div>
      </div>

      <SlideOver
        open={panelOpen}
        title="Yeni əməliyyat"
        subtitle="Gəlir və ya xərc qeydinin məlumatları"
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tip" required {...register('type', { required: true })}>
              <option value="1">Gəlir</option>
              <option value="2">Xərc</option>
            </Select>
            <Select label="Kateqoriya" required {...register('categoryId', { required: true })}>
              <option value="">Seçin...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tarix" required type="date" {...register('date', { required: true })} />
            <Input
              label="Məbləğ (₼)"
              required
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { required: true })}
            />
          </div>
          <Select label="Üsul" required {...register('method', { required: true })}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Input label="Təsvir" placeholder="Əməliyyat barədə qeyd..." {...register('description')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Əməliyyatı sil"
        message={
          pendingDelete
            ? `${fmtDate(pendingDelete.date)} tarixli ${fmtMoney(pendingDelete.amount)} məbləğində əməliyyat silinsin?`
            : ''
        }
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
