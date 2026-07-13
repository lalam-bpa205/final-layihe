import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  Select,
  SlideOver,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui';
import { fmtMoney } from './financeShared';

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

function BudgetSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm animate-pulse">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-3.5 w-10 rounded bg-slate-100" />
      </div>
      <div className="mb-3 h-6 w-24 rounded bg-slate-200" />
      <div className="h-3 rounded-full bg-slate-100" />
    </div>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/finance/budgets', { params: { year, month } })
      .then(({ data }) => setBudgets(data))
      .catch(() => notify.error('Büdcələr yüklənə bilmədi.'))
      .finally(() => setLoading(false));
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
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/finance/budgets', {
        year,
        month,
        categoryId: Number(values.categoryId),
        limitAmount: Number(values.limitAmount),
      });
      setPanelOpen(false);
      notify.success('Büdcə təyin edildi.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/finance/budgets/${pendingDelete.id}`);
      notify.success('Büdcə silindi.');
      setPendingDelete(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Büdcə"
        description="Xərc kateqoriyaları üzrə aylıq limitlər və istifadə səviyyəsi"
        actions={
          <>
            <Select
              className="w-36"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select
              className="w-28"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
            <Button onClick={openCreate}>+ Büdcə təyin et</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <BudgetSkeleton key={i} />)
        ) : (
          budgets.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold tracking-tight text-slate-800">{b.categoryName}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setPendingDelete(b)}
                >
                  Sil
                </Button>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span
                  className={`text-xl font-bold tabular-nums ${
                    b.isOverBudget ? 'text-red-600' : 'text-slate-800'
                  }`}
                >
                  {fmtMoney(b.spentAmount)}
                </span>
                <span className="text-sm text-slate-500 tabular-nums">
                  / {fmtMoney(b.limitAmount)} ({b.usagePercent}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    b.isOverBudget
                      ? 'bg-red-500'
                      : b.usagePercent >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(b.usagePercent, 100)}%` }}
                />
              </div>
              {b.isOverBudget && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  ⚠️ Büdcə {fmtMoney(b.spentAmount - b.limitAmount)} aşılıb!
                </p>
              )}
            </div>
          ))
        )}
        {!loading && budgets.length === 0 && (
          <div className="col-span-full rounded-2xl border border-slate-200/60 bg-white shadow-sm">
            <EmptyState
              icon="🎯"
              title="Büdcə təyin edilməyib"
              description={`${MONTHS[month - 1]} ${year} üçün hələ heç bir xərc limiti qoyulmayıb.`}
              action={<Button onClick={openCreate}>+ Büdcə təyin et</Button>}
            />
          </div>
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={`${MONTHS[month - 1]} ${year} — büdcə`}
        subtitle="Xərc kateqoriyası üçün aylıq limit"
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Xərc kateqoriyası" required {...register('categoryId', { required: true })}>
            <option value="">Seçin...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input
            label="Aylıq limit (₼)"
            required
            type="number"
            step="0.01"
            min="0"
            {...register('limitAmount', { required: true })}
          />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Büdcəni sil"
        message={
          pendingDelete
            ? `"${pendingDelete.categoryName}" kateqoriyasının bu ay üçün büdcəsi silinsin?`
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
