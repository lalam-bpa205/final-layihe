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
  ConfirmDialog,
  EmptyState,
  SkeletonRows,
} from '../../components/ui';
import {
  SO_STATUS,
  PO_STATUS,
  SalesOrderStatusBadge,
  PurchaseOrderStatusBadge,
  fmtMoney,
  fmtDate,
} from './salesShared';

function OrdersPage({ kind }) {
  const navigate = useNavigate();
  const isSales = kind === 'sales';
  const endpoint = isSales ? '/sales-orders' : '/purchase-orders';
  const detailPath = isSales ? '/sales/sales-orders' : '/sales/purchase-orders';
  const partnerEndpoint = isSales ? '/customers' : '/suppliers';
  const partnerLabel = isSales ? 'Müştəri' : 'Təchizatçı';
  const title = isSales ? 'Satış sifarişləri' : 'Alış sifarişləri';
  const actionLabel = isSales ? 'Təsdiqlə' : 'Qəbul et';
  const actionPath = isSales ? 'confirm' : 'receive';
  const STATUS = isSales ? SO_STATUS : PO_STATUS;

  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { order, action }
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, control, watch, setValue, formState } = useForm({
    defaultValues: { items: [{ productId: '', quantity: 1, unitPrice: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

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
      .get(endpoint, { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('Sifarişlər yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [endpoint, page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get(partnerEndpoint).then(({ data }) => setPartners(data));
    api.get('/products', { params: { pageSize: 100 } }).then(({ data }) => setProducts(data.items));
    api.get('/warehouses').then(({ data }) => setWarehouses(data));
  }, [partnerEndpoint]);

  const total = (watchItems ?? []).reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0
  );

  const openCreate = () => {
    reset({
      partnerId: '', warehouseId: '',
      orderDate: new Date().toISOString().slice(0, 10),
      note: '',
      items: [{ productId: '', quantity: 1, unitPrice: '' }],
    });
    setError(null);
    setCreateOpen(true);
  };

  // Məhsul seçiləndə qiymət avtomatik doldurulur (satışda satış, alışda alış qiyməti)
  const onProductChange = (index, productId) => {
    const product = products.find((p) => p.id === Number(productId));
    if (product) {
      setValue(`items.${index}.unitPrice`, isSales ? product.salePrice : product.purchasePrice);
    }
  };

  const onSubmit = async (values) => {
    try {
      await api.post(endpoint, {
        partnerId: Number(values.partnerId),
        orderDate: values.orderDate,
        warehouseId: Number(values.warehouseId),
        note: values.note || null,
        items: values.items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      setCreateOpen(false);
      notify.success('Sifariş yaradıldı.');
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

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await api.post(`${endpoint}/${pendingAction.order.id}/${pendingAction.action}`);
      notify.success(
        pendingAction.action === 'cancel'
          ? 'Sifariş ləğv edildi.'
          : isSales
            ? 'Sifariş təsdiqləndi.'
            : 'Sifariş qəbul edildi.'
      );
      setPendingAction(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilters = Boolean(search || statusFilter);
  const colCount = isSales ? 8 : 7;
  const confirmMessage = pendingAction
    ? pendingAction.action === 'cancel'
      ? `${pendingAction.order.number} ləğv edilsin? Bu əməliyyat geri qaytarıla bilməz.`
      : isSales
        ? `${pendingAction.order.number} təsdiqlənsin? Stok çıxışı və faktura yaradılacaq.`
        : `${pendingAction.order.number} qəbul edilsin? Stok girişi və xərc qeydi yaradılacaq.`
    : '';

  return (
    <div>
      <PageHeader
        title={title}
        description={
          isSales
            ? 'Müştəri sifarişləri, təsdiq və faktura axını'
            : 'Təchizatçı sifarişləri, qəbul və xərc axını'
        }
        actions={<Button onClick={openCreate}>+ Yeni sifariş</Button>}
      />

      {/* Filtrlər */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-80 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            placeholder={`Nömrə və ya ${partnerLabel.toLowerCase()} üzrə axtar...`}
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
          {Object.entries(STATUS).map(([value, s]) => (
            <option key={value} value={value}>{s.text}</option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Nömrə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">{partnerLabel}</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Anbar</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
              {isSales && (
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Faktura</th>
              )}
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={colCount} />
            ) : (
              result.items.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`${detailPath}/${o.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5 font-mono font-semibold text-slate-800">{o.number}</td>
                  <td className="px-6 py-3.5 text-slate-700">
                    {isSales ? o.customerName : o.supplierName}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap tabular-nums text-slate-500">
                    {fmtDate(o.orderDate)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{o.warehouseName}</td>
                  <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-slate-800">
                    {fmtMoney(o.totalAmount)}
                  </td>
                  {isSales && (
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                      {o.invoiceNumber || '—'}
                    </td>
                  )}
                  <td className="px-6 py-3.5">
                    {isSales ? (
                      <SalesOrderStatusBadge status={o.status} />
                    ) : (
                      <PurchaseOrderStatusBadge status={o.status} />
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    {o.status === 1 && (
                      <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => setPendingAction({ order: o, action: actionPath })}
                        >
                          {actionLabel}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setPendingAction({ order: o, action: 'cancel' })}
                        >
                          Ləğv et
                        </Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && result.items.length === 0 && (
          <EmptyState
            icon={isSales ? '📤' : '📥'}
            title={hasFilters ? 'Nəticə tapılmadı' : 'Hələ sifariş yoxdur'}
            description={
              hasFilters
                ? 'Axtarış və ya filtr şərtlərinə uyğun sifariş tapılmadı.'
                : 'İlk sifarişi yaradaraq başlayın.'
            }
            action={!hasFilters && <Button onClick={openCreate}>+ Yeni sifariş</Button>}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} sifariş</span>
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

      {/* Yeni sifariş */}
      <SlideOver
        open={createOpen}
        title="Yeni sifariş"
        subtitle={
          isSales
            ? 'Müştəri sifarişinin məlumatları və məhsul sətirləri'
            : 'Təchizatçı sifarişinin məlumatları və məhsul sətirləri'
        }
        onClose={() => setCreateOpen(false)}
        wide
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label={partnerLabel} required {...register('partnerId', { required: true })}>
              <option value="">Seçin...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Select label="Anbar" required {...register('warehouseId', { required: true })}>
              <option value="">Seçin...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
            <Input label="Tarix" required type="date" {...register('orderDate', { required: true })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Məhsullar <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: '' })}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                + Məhsul əlavə et
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Select
                    className="flex-1"
                    {...register(`items.${index}.productId`, {
                      required: true,
                      onChange: (e) => onProductChange(index, e.target.value),
                    })}
                  >
                    <option value="">Məhsul seçin...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (stok: {p.currentStock})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="w-24"
                    placeholder="Miqdar"
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

          <Input label="Qeyd" placeholder="Sifariş barədə qeyd..." {...register('note')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Sifariş yarat
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.action === 'cancel'
            ? 'Sifarişi ləğv et'
            : isSales
              ? 'Sifarişi təsdiqlə'
              : 'Sifarişi qəbul et'
        }
        message={confirmMessage}
        confirmText={pendingAction?.action === 'cancel' ? 'Ləğv et' : actionLabel}
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

export function SalesOrdersPage() {
  return <OrdersPage kind="sales" />;
}

export function PurchaseOrdersPage() {
  return <OrdersPage kind="purchase" />;
}
