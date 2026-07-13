import { useCallback, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  Select,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';
import { INVOICE_STATUS, PAYMENT_METHODS, InvoiceStatusBadge, fmtMoney, fmtDate } from './financeShared';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, control, watch, formState } = useForm({
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  const payForm = useForm();

  // Axtarış debounce (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    setLoading(true);
    api
      .get('/invoices', { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('Fakturalar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const total = (watchItems ?? []).reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0
  );

  const openCreate = () => {
    reset({
      customerName: '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      note: '',
      items: [{ description: '', quantity: 1, unitPrice: '' }],
    });
    setError(null);
    setCreateOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/invoices', {
        customerName: values.customerName,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        note: values.note || null,
        items: values.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      setCreateOpen(false);
      notify.success('Faktura yaradıldı.');
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

  const openPay = (inv) => {
    payForm.reset({
      date: new Date().toISOString().slice(0, 10),
      amount: inv.remainingAmount,
      method: '3',
      note: '',
    });
    setError(null);
    setPayInvoice(inv);
  };

  const onPay = async (values) => {
    try {
      await api.post(`/invoices/${payInvoice.id}/payments`, {
        date: values.date,
        amount: Number(values.amount),
        method: Number(values.method),
        note: values.note || null,
      });
      setPayInvoice(null);
      notify.success('Ödəniş qeydə alındı.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmCancel = async () => {
    if (!pendingCancel) return;
    setCancelLoading(true);
    try {
      await api.post(`/invoices/${pendingCancel.id}/cancel`);
      notify.success('Faktura ləğv edildi.');
      setPendingCancel(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setCancelLoading(false);
    }
  };

  const hasFilters = Boolean(search || statusFilter);

  return (
    <div>
      <PageHeader
        title="Fakturalar"
        description="Müştəri fakturaları, ödənişlər və qalıqlar"
        actions={<Button onClick={openCreate}>+ Yeni faktura</Button>}
      />

      {/* Filtrlər */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-80 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            placeholder="Nömrə və ya müştəri üzrə axtar..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          className="w-48"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(INVOICE_STATUS).map(([value, s]) => (
            <option key={value} value={value}>{s.text}</option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Nömrə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Müştəri</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Buraxılış</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Son tarix</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Qalıq</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={8} />
            ) : (
              result.items.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/finance/invoices/${inv.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5 font-mono font-semibold text-slate-800">
                    {inv.number}
                  </td>
                  <td className="px-6 py-3.5 text-slate-700">{inv.customerName}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap tabular-nums text-slate-500">
                    {fmtDate(inv.issueDate)}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap tabular-nums text-slate-500">
                    {fmtDate(inv.dueDate)}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-slate-800">
                    {fmtMoney(inv.totalAmount)}
                  </td>
                  <td
                    className={`px-6 py-3.5 text-right tabular-nums ${
                      (inv.remainingAmount ?? 0) > 0 ? 'font-medium text-red-600' : 'text-slate-500'
                    }`}
                  >
                    {fmtMoney(inv.remainingAmount)}
                  </td>
                  <td className="px-6 py-3.5">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      {(inv.status === 1 || inv.status === 2) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => openPay(inv)}
                        >
                          Ödəniş qəbul et
                        </Button>
                      )}
                      {inv.status === 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setPendingCancel(inv)}
                        >
                          Ləğv et
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && result.items.length === 0 && (
          <EmptyState
            icon="🧾"
            title={hasFilters ? 'Nəticə tapılmadı' : 'Hələ faktura yoxdur'}
            description={
              hasFilters
                ? 'Axtarış və ya filtr şərtlərinə uyğun faktura tapılmadı.'
                : 'İlk fakturanı yaradaraq başlayın.'
            }
            action={!hasFilters && <Button onClick={openCreate}>+ Yeni faktura</Button>}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} faktura</span>
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

      {/* Yeni faktura */}
      <SlideOver
        open={createOpen}
        title="Yeni faktura"
        subtitle="Müştəri fakturasının məlumatları və sətirləri"
        onClose={() => setCreateOpen(false)}
        wide
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Müştəri" required {...register('customerName', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Buraxılış tarixi"
              required
              type="date"
              {...register('issueDate', { required: true })}
            />
            <Input
              label="Son ödəniş tarixi"
              required
              type="date"
              {...register('dueDate', { required: true })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Sətirlər <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: '' })}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                + Sətir əlavə et
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Input
                    className="flex-1"
                    placeholder="Təsvir (məs. Bakı-Gəncə daşınma xidməti)"
                    {...register(`items.${index}.description`, { required: true })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-20"
                    placeholder="Say"
                    {...register(`items.${index}.quantity`, { required: true })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-28"
                    placeholder="Qiymət"
                    {...register(`items.${index}.unitPrice`, { required: true })}
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label="Sətri sil"
                      className="rounded-lg px-2 py-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-semibold text-slate-700">
              Cəmi: {fmtMoney(total)}
            </p>
          </div>

          <Input label="Qeyd" placeholder="Faktura barədə qeyd..." {...register('note')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Faktura yarat
          </Button>
        </form>
      </SlideOver>

      {/* Ödəniş qəbulu */}
      <SlideOver
        open={Boolean(payInvoice)}
        title={`${payInvoice?.number ?? ''} — ödəniş qəbulu`}
        subtitle="Faktura üzrə daxil olan ödənişi qeydə al"
        onClose={() => setPayInvoice(null)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        {payInvoice && (
          <form onSubmit={payForm.handleSubmit(onPay)} className="space-y-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ümumi: <b>{fmtMoney(payInvoice.totalAmount)}</b> · Ödənilib:{' '}
              <b>{fmtMoney(payInvoice.paidAmount)}</b> · Qalıq:{' '}
              <b className="text-red-600">{fmtMoney(payInvoice.remainingAmount)}</b>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tarix"
                required
                type="date"
                {...payForm.register('date', { required: true })}
              />
              <Input
                label="Məbləğ (₼)"
                required
                type="number"
                step="0.01"
                min="0"
                {...payForm.register('amount', { required: true })}
              />
            </div>
            <Select label="Üsul" required {...payForm.register('method', { required: true })}>
              {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Input label="Qeyd" placeholder="Ödəniş barədə qeyd..." {...payForm.register('note')} />
            <Button type="submit" className="w-full" loading={payForm.formState.isSubmitting}>
              Ödənişi təsdiqlə
            </Button>
          </form>
        )}
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Fakturanı ləğv et"
        message={pendingCancel ? `${pendingCancel.number} ləğv edilsin? Bu əməliyyat geri qaytarıla bilməz.` : ''}
        confirmText="Ləğv et"
        loading={cancelLoading}
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}
