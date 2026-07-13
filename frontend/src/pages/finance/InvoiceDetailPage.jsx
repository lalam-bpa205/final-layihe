import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import { Button, Input, Select, SlideOver, ConfirmDialog } from '../../components/ui';
import { PAYMENT_METHODS, InvoiceStatusBadge, fmtMoney, fmtDate } from './financeShared';

// Çap zamanı yalnız faktura kartı görünür — sidebar, header və action bar gizlənir.
const PRINT_CSS = `
@media print {
  aside, header, .no-print { display: none !important; }
  body { background: #fff !important; }
  main { padding: 0 !important; overflow: visible !important; }
  .invoice-sheet {
    max-width: none !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
}
`;

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse rounded-2xl border border-slate-200/60 bg-white p-10 shadow-sm">
      <div className="mb-10 flex justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-3 w-44 rounded bg-slate-100" />
        </div>
        <div className="h-6 w-40 rounded bg-slate-200" />
      </div>
      <div className="mb-8 h-16 rounded bg-slate-100" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(() => {
    api
      .get(`/invoices/${id}`)
      .then(({ data }) => setInvoice(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openPay = () => {
    reset({
      date: new Date().toISOString().slice(0, 10),
      amount: invoice.remainingAmount,
      method: '3',
      note: '',
    });
    setError(null);
    setPayOpen(true);
  };

  const onPay = async (values) => {
    try {
      await api.post(`/invoices/${id}/payments`, {
        date: values.date,
        amount: Number(values.amount),
        method: Number(values.method),
        note: values.note || null,
      });
      setPayOpen(false);
      notify.success('Ödəniş qeydə alındı.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const onCancel = async () => {
    setActionLoading(true);
    try {
      await api.post(`/invoices/${id}/cancel`);
      notify.success('Faktura ləğv edildi.');
      setCancelOpen(false);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (notFound || !invoice) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/60 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">Faktura tapılmadı</p>
        <p className="mt-1 text-sm text-slate-500">Bu nömrəli faktura mövcud deyil və ya silinib.</p>
        <Link to="/finance/invoices" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          ← Fakturalara qayıt
        </Link>
      </div>
    );
  }

  const items = invoice.items ?? [];
  const payments = invoice.payments ?? [];

  return (
    <div>
      <style>{PRINT_CSS}</style>

      {/* Action bar — çapda gizlənir */}
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link
          to="/finance/invoices"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← Fakturalar
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            🖨 Çap et
          </Button>
          {(invoice.status === 1 || invoice.status === 2) && (
            <Button onClick={openPay}>Ödəniş qəbul et</Button>
          )}
          {invoice.status === 1 && (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              Ləğv et
            </Button>
          )}
        </div>
      </div>

      {/* Faktura kartı — A4-vari professional görünüş */}
      <div className="invoice-sheet mx-auto max-w-3xl rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm sm:p-10">
        {/* Başlıq */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              Smart<span className="text-blue-600">ERP</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Logistika İdarəetmə Sistemi</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold tracking-tight text-slate-900">
              FAKTURA {invoice.number}
            </p>
            <div className="mt-1.5 flex justify-end">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Müştəri və tarixlər */}
        <div className="flex flex-wrap items-start justify-between gap-6 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Müştəri</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{invoice.customerName}</p>
          </div>
          <div className="flex gap-10 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Buraxılış tarixi
              </p>
              <p className="mt-1 tabular-nums font-medium text-slate-800">
                {fmtDate(invoice.issueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Son ödəniş tarixi
              </p>
              <p className="mt-1 tabular-nums font-medium text-slate-800">
                {fmtDate(invoice.dueDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Sətirlər */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 pr-4 text-left">Təsvir</th>
                <th className="px-4 py-2.5 text-right">Say</th>
                <th className="px-4 py-2.5 text-right">Qiymət</th>
                <th className="py-2.5 pl-4 text-right">Cəm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={item.id ?? i}>
                  <td className="py-3 pr-4 text-slate-800">{item.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {Number(item.quantity ?? 0).toLocaleString('az-AZ')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {fmtMoney(item.unitPrice)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums font-medium text-slate-800">
                    {fmtMoney(item.total ?? Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Yekun blok */}
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <dl className="w-full max-w-64 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Cəmi</dt>
              <dd className="tabular-nums font-medium text-slate-800">
                {fmtMoney(invoice.totalAmount)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Ödənilib</dt>
              <dd className="tabular-nums font-medium text-emerald-600">
                {fmtMoney(invoice.paidAmount)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
              <dt className="font-semibold text-slate-900">Qalıq</dt>
              <dd
                className={`tabular-nums text-base font-bold ${
                  (invoice.remainingAmount ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {fmtMoney(invoice.remainingAmount)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Ödəniş tarixçəsi */}
        {payments.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ödəniş tarixçəsi
            </h3>
            <ul className="divide-y divide-slate-100 border-y border-slate-200">
              {payments.map((p, i) => (
                <li key={p.id ?? i} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="tabular-nums text-slate-500">{fmtDate(p.date)}</span>
                  <span className="flex-1 text-slate-500">
                    {PAYMENT_METHODS[p.method] ?? p.method}
                    {p.note && <span className="text-slate-400"> • {p.note}</span>}
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-600">
                    +{fmtMoney(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Qeyd */}
        {invoice.note && (
          <div className="mt-8">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Qeyd
            </h3>
            <p className="text-sm text-slate-600">{invoice.note}</p>
          </div>
        )}
      </div>

      {/* Ödəniş qəbulu */}
      <SlideOver
        open={payOpen}
        title={`${invoice.number} — ödəniş qəbulu`}
        subtitle="Faktura üzrə daxil olan ödənişi qeydə al"
        onClose={() => setPayOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onPay)} className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Ümumi: <b>{fmtMoney(invoice.totalAmount)}</b> · Ödənilib:{' '}
            <b>{fmtMoney(invoice.paidAmount)}</b> · Qalıq:{' '}
            <b className="text-red-600">{fmtMoney(invoice.remainingAmount)}</b>
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
          <Input label="Qeyd" placeholder="Ödəniş barədə qeyd..." {...register('note')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Ödənişi təsdiqlə
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={cancelOpen}
        title="Fakturanı ləğv et"
        message={`${invoice.number} ləğv edilsin? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmText="Ləğv et"
        loading={actionLoading}
        onConfirm={onCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
