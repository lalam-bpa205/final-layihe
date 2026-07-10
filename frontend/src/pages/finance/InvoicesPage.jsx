import { notify } from '../../notify';
import { useCallback, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const STATUS = {
  1: { text: 'Ödənilməyib', cls: 'bg-red-100 text-red-700' },
  2: { text: 'Qismən ödənilib', cls: 'bg-yellow-100 text-yellow-700' },
  3: { text: 'Ödənilib', cls: 'bg-green-100 text-green-700' },
  4: { text: 'Ləğv edilib', cls: 'bg-slate-100 text-slate-600' },
};

const METHODS = { 1: 'Nağd', 2: 'Kart', 3: 'Bank köçürməsi' };

export default function InvoicesPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, control, watch } = useForm({
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  const payForm = useForm();

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    api.get('/invoices', { params }).then(({ data }) => setResult(data));
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
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const onCancel = async (inv) => {
    if (!confirm(`${inv.number} ləğv edilsin?`)) return;
    try {
      await api.post(`/invoices/${inv.id}/cancel`);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Fakturalar</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni faktura
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Nömrə və ya müştəri üzrə axtar..."
          className="rounded-lg border border-slate-300 px-3 py-2 w-72"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS).map(([value, s]) => (
            <option key={value} value={value}>{s.text}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Nömrə</th>
              <th className="text-left px-6 py-3 font-semibold">Müştəri</th>
              <th className="text-left px-6 py-3 font-semibold">Buraxılış</th>
              <th className="text-left px-6 py-3 font-semibold">Son tarix</th>
              <th className="text-right px-6 py-3 font-semibold">Məbləğ</th>
              <th className="text-right px-6 py-3 font-semibold">Qalıq</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((inv) => {
              const st = STATUS[inv.status] ?? { text: inv.status, cls: 'bg-slate-100' };
              return (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{inv.number}</td>
                  <td className="px-6 py-3">{inv.customerName}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{inv.issueDate}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{inv.dueDate}</td>
                  <td className="px-6 py-3 text-right font-semibold">
                    {inv.totalAmount.toLocaleString()} ₼
                  </td>
                  <td className="px-6 py-3 text-right">
                    {inv.remainingAmount.toLocaleString()} ₼
                  </td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                    {(inv.status === 1 || inv.status === 2) && (
                      <button onClick={() => openPay(inv)} className="text-green-600 hover:underline">
                        Ödəniş qəbul et
                      </button>
                    )}
                    {inv.status === 1 && (
                      <button onClick={() => onCancel(inv)} className="text-red-600 hover:underline">
                        Ləğv et
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  Faktura tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} faktura</span>
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

      {/* Yeni faktura */}
      <Modal open={createOpen} title="Yeni faktura" onClose={() => setCreateOpen(false)}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Müştəri *</label>
            <input className={inputCls} {...register('customerName', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Buraxılış tarixi *</label>
              <input type="date" className={inputCls} {...register('issueDate', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Son ödəniş tarixi *</label>
              <input type="date" className={inputCls} {...register('dueDate', { required: true })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Sətirlər *</label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: '' })}
                className="text-sm text-blue-600 hover:underline"
              >
                + Sətir əlavə et
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Təsvir (məs. Bakı-Gəncə daşınma xidməti)"
                    {...register(`items.${index}.description`, { required: true })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputCls} w-20`}
                    placeholder="Say"
                    {...register(`items.${index}.quantity`, { required: true })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputCls} w-28`}
                    placeholder="Qiymət"
                    {...register(`items.${index}.unitPrice`, { required: true })}
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700 px-2 py-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-semibold text-slate-700">
              Cəmi: {total.toLocaleString()} ₼
            </p>
          </div>

          <div>
            <label className={labelCls}>Qeyd</label>
            <input className={inputCls} {...register('note')} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Faktura yarat
          </button>
        </form>
      </Modal>

      {/* Ödəniş qəbulu */}
      <Modal
        open={!!payInvoice}
        title={`${payInvoice?.number ?? ''} — ödəniş qəbulu`}
        onClose={() => setPayInvoice(null)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        {payInvoice && (
          <form onSubmit={payForm.handleSubmit(onPay)} className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ümumi: <b>{payInvoice.totalAmount.toLocaleString()} ₼</b> · Ödənilib:{' '}
              <b>{payInvoice.paidAmount.toLocaleString()} ₼</b> · Qalıq:{' '}
              <b className="text-red-600">{payInvoice.remainingAmount.toLocaleString()} ₼</b>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Tarix *</label>
                <input type="date" className={inputCls} {...payForm.register('date', { required: true })} />
              </div>
              <div>
                <label className={labelCls}>Məbləğ (₼) *</label>
                <input type="number" step="0.01" className={inputCls} {...payForm.register('amount', { required: true })} />
              </div>
              <div>
                <label className={labelCls}>Üsul *</label>
                <select className={inputCls} {...payForm.register('method', { required: true })}>
                  {Object.entries(METHODS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Qeyd</label>
              <input className={inputCls} {...payForm.register('note')} />
            </div>
            <button className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium py-2">
              Ödənişi təsdiqlə
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
