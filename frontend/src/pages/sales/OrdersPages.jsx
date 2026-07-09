import { useCallback, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

function OrdersPage({ kind }) {
  const isSales = kind === 'sales';
  const endpoint = isSales ? '/sales-orders' : '/purchase-orders';
  const partnerEndpoint = isSales ? '/customers' : '/suppliers';
  const partnerLabel = isSales ? 'Müştəri' : 'Təchizatçı';
  const title = isSales ? 'Satış sifarişləri' : 'Alış sifarişləri';
  const actionLabel = isSales ? 'Təsdiqlə' : 'Qəbul et';
  const actionPath = isSales ? 'confirm' : 'receive';

  const STATUS = isSales
    ? {
        1: { text: 'Gözləyir', cls: 'bg-yellow-100 text-yellow-700' },
        2: { text: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700' },
        3: { text: 'Ləğv edilib', cls: 'bg-slate-100 text-slate-600' },
      }
    : {
        1: { text: 'Gözləyir', cls: 'bg-yellow-100 text-yellow-700' },
        2: { text: 'Qəbul edilib', cls: 'bg-green-100 text-green-700' },
        3: { text: 'Ləğv edilib', cls: 'bg-slate-100 text-slate-600' },
      };

  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, control, watch, setValue } = useForm({
    defaultValues: { items: [{ productId: '', quantity: 1, unitPrice: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    api.get(endpoint, { params }).then(({ data }) => setResult(data));
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
    setModalOpen(true);
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

  const act = async (order, action) => {
    const text = action === 'cancel'
      ? `${order.number} ləğv edilsin?`
      : `${order.number} ${isSales ? 'təsdiqlənsin? Stok çıxışı və faktura yaradılacaq.' : 'qəbul edilsin? Stok girişi və xərc qeydi yaradılacaq.'}`;
    if (!confirm(text)) return;

    try {
      await api.post(`${endpoint}/${order.id}/${action}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni sifariş
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder={`Nömrə və ya ${partnerLabel.toLowerCase()} üzrə axtar...`}
          className="rounded-lg border border-slate-300 px-3 py-2 w-80"
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
              <th className="text-left px-6 py-3 font-semibold">{partnerLabel}</th>
              <th className="text-left px-6 py-3 font-semibold">Tarix</th>
              <th className="text-left px-6 py-3 font-semibold">Anbar</th>
              <th className="text-right px-6 py-3 font-semibold">Məbləğ</th>
              {isSales && <th className="text-left px-6 py-3 font-semibold">Faktura</th>}
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((o) => {
              const st = STATUS[o.status] ?? { text: o.status, cls: 'bg-slate-100' };
              return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">
                    <button onClick={() => setDetail(o)} className="hover:underline text-blue-700">
                      {o.number}
                    </button>
                  </td>
                  <td className="px-6 py-3">{isSales ? o.customerName : o.supplierName}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{o.orderDate}</td>
                  <td className="px-6 py-3">{o.warehouseName}</td>
                  <td className="px-6 py-3 text-right font-semibold">
                    {o.totalAmount.toLocaleString()} ₼
                  </td>
                  {isSales && (
                    <td className="px-6 py-3 font-mono text-xs">{o.invoiceNumber || '—'}</td>
                  )}
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                    {o.status === 1 && (
                      <>
                        <button onClick={() => act(o, actionPath)} className="text-green-600 hover:underline">
                          {actionLabel}
                        </button>
                        <button onClick={() => act(o, 'cancel')} className="text-red-600 hover:underline">
                          Ləğv et
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={isSales ? 8 : 7} className="px-6 py-8 text-center text-slate-400">
                  Sifariş tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} sifariş</span>
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

      {/* Yeni sifariş */}
      <Modal open={modalOpen} title={`Yeni ${title.toLowerCase().slice(0, -3)}i`} onClose={() => setModalOpen(false)}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{partnerLabel} *</label>
              <select className={inputCls} {...register('partnerId', { required: true })}>
                <option value="">Seçin...</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Anbar *</label>
              <select className={inputCls} {...register('warehouseId', { required: true })}>
                <option value="">Seçin...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tarix *</label>
              <input type="date" className={inputCls} {...register('orderDate', { required: true })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Məhsullar *</label>
              <button
                type="button"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: '' })}
                className="text-sm text-blue-600 hover:underline"
              >
                + Məhsul əlavə et
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <select
                    className={`${inputCls} flex-1`}
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
                  </select>
                  <input
                    type="number" step="0.001"
                    className={`${inputCls} w-24`}
                    placeholder="Miqdar"
                    {...register(`items.${index}.quantity`, { required: true })}
                  />
                  <input
                    type="number" step="0.01"
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
            Sifariş yarat
          </button>
        </form>
      </Modal>

      {/* Sifariş detalları */}
      <Modal
        open={!!detail}
        title={`${detail?.number ?? ''} — detallar`}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p><b>{partnerLabel}:</b> {isSales ? detail.customerName : detail.supplierName}</p>
              <p><b>Anbar:</b> {detail.warehouseName}</p>
              <p><b>Tarix:</b> {detail.orderDate}</p>
              {isSales && detail.invoiceNumber && <p><b>Faktura:</b> {detail.invoiceNumber}</p>}
            </div>
            <table className="w-full text-sm border-t border-slate-100">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left py-2">Məhsul</th>
                  <th className="text-right py-2">Miqdar</th>
                  <th className="text-right py-2">Qiymət</th>
                  <th className="text-right py-2">Cəm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">{i.productName}</td>
                    <td className="py-2 text-right">{i.quantity} {i.unit}</td>
                    <td className="py-2 text-right">{i.unitPrice.toFixed(2)} ₼</td>
                    <td className="py-2 text-right font-medium">{i.lineTotal.toFixed(2)} ₼</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-bold text-slate-800">
              Ümumi: {detail.totalAmount.toLocaleString()} ₼
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function SalesOrdersPage() {
  return <OrdersPage kind="sales" />;
}

export function PurchaseOrdersPage() {
  return <OrdersPage kind="purchase" />;
}
