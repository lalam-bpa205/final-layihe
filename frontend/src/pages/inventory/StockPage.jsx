import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const TYPE_LABELS = {
  1: { text: 'Giriş', cls: 'bg-green-100 text-green-700' },
  2: { text: 'Çıxış', cls: 'bg-red-100 text-red-700' },
  3: { text: 'Transfer (qəbul)', cls: 'bg-blue-100 text-blue-700' },
  4: { text: 'Transfer (göndərmə)', cls: 'bg-orange-100 text-orange-700' },
};

export default function StockPage() {
  const [tab, setTab] = useState('movements');
  const [movements, setMovements] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [levels, setLevels] = useState([]);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [modal, setModal] = useState(null); // 'in' | 'out' | 'transfer'
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const loadMovements = useCallback(() => {
    api.get('/stock/movements', { params: { page, pageSize: 10 } })
      .then(({ data }) => setMovements(data));
  }, [page]);

  const loadLevels = useCallback(() => {
    api.get('/stock/levels').then(({ data }) => setLevels(data));
  }, []);

  useEffect(() => {
    loadMovements();
    loadLevels();
  }, [loadMovements, loadLevels]);

  useEffect(() => {
    api.get('/products', { params: { pageSize: 100 } })
      .then(({ data }) => setProducts(data.items));
    api.get('/warehouses').then(({ data }) => setWarehouses(data));
  }, []);

  const openModal = (type) => {
    reset({
      productId: '', warehouseId: '', fromWarehouseId: '', toWarehouseId: '',
      quantity: '', unitPrice: '', note: '',
    });
    setError(null);
    setModal(type);
  };

  const onSubmit = async (values) => {
    try {
      if (modal === 'in') {
        await api.post('/stock/in', {
          productId: Number(values.productId),
          warehouseId: Number(values.warehouseId),
          quantity: Number(values.quantity),
          unitPrice: values.unitPrice ? Number(values.unitPrice) : null,
          note: values.note || null,
        });
      } else if (modal === 'out') {
        await api.post('/stock/out', {
          productId: Number(values.productId),
          warehouseId: Number(values.warehouseId),
          quantity: Number(values.quantity),
          note: values.note || null,
        });
      } else {
        await api.post('/stock/transfer', {
          productId: Number(values.productId),
          fromWarehouseId: Number(values.fromWarehouseId),
          toWarehouseId: Number(values.toWarehouseId),
          quantity: Number(values.quantity),
          note: values.note || null,
        });
      }
      setModal(null);
      loadMovements();
      loadLevels();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.errors
          ? Object.values(data.errors).flat().join(' ')
          : data?.message ?? 'Xəta baş verdi.'
      );
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const tabCls = (t) =>
    `px-4 py-2 rounded-lg text-sm font-medium ${
      tab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Stok idarəetməsi</h2>
        <div className="space-x-2">
          <button onClick={() => openModal('in')} className="rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2">
            + Giriş
          </button>
          <button onClick={() => openModal('out')} className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2">
            − Çıxış
          </button>
          <button onClick={() => openModal('transfer')} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2">
            ⇄ Transfer
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button className={tabCls('movements')} onClick={() => setTab('movements')}>Hərəkətlər</button>
        <button className={tabCls('levels')} onClick={() => setTab('levels')}>Qalıqlar</button>
      </div>

      {tab === 'movements' ? (
        <>
          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Tarix</th>
                  <th className="text-left px-6 py-3 font-semibold">Məhsul</th>
                  <th className="text-left px-6 py-3 font-semibold">Anbar</th>
                  <th className="text-left px-6 py-3 font-semibold">Növ</th>
                  <th className="text-right px-6 py-3 font-semibold">Miqdar</th>
                  <th className="text-left px-6 py-3 font-semibold">Qeyd</th>
                  <th className="text-left px-6 py-3 font-semibold">Kim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.items.map((m) => {
                  const t = TYPE_LABELS[m.type] ?? { text: m.type, cls: 'bg-slate-100' };
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(m.createdDate).toLocaleString('az')}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">{m.productName}</td>
                      <td className="px-6 py-3">{m.warehouseName}</td>
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.cls}`}>
                          {t.text}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">{m.quantity}</td>
                      <td className="px-6 py-3 text-slate-500 max-w-40 truncate">{m.note || '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{m.createdBy}</td>
                    </tr>
                  );
                })}
                {movements.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Hələ stok hərəkəti yoxdur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <span>Cəmi: {movements.totalCount} hərəkət</span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
              >
                ← Əvvəlki
              </button>
              <span>Səhifə {movements.page} / {Math.max(movements.totalPages, 1)}</span>
              <button
                disabled={page >= movements.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
              >
                Növbəti →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Məhsul</th>
                <th className="text-left px-6 py-3 font-semibold">Anbar</th>
                <th className="text-right px-6 py-3 font-semibold">Qalıq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {levels.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{l.productName}</td>
                  <td className="px-6 py-3">{l.warehouseName}</td>
                  <td className="px-6 py-3 text-right font-semibold">
                    {l.quantity} {l.unit}
                  </td>
                </tr>
              ))}
              {levels.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                    Anbarlarda qalıq yoxdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!modal}
        title={modal === 'in' ? 'Stok girişi' : modal === 'out' ? 'Stok çıxışı' : 'Anbarlar arası transfer'}
        onClose={() => setModal(null)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Məhsul *</label>
            <select className={inputCls} {...register('productId', { required: true })}>
              <option value="">Seçin...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.barcode})
                </option>
              ))}
            </select>
          </div>

          {modal === 'transfer' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Göndərən anbar *</label>
                <select className={inputCls} {...register('fromWarehouseId', { required: true })}>
                  <option value="">Seçin...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Qəbul edən anbar *</label>
                <select className={inputCls} {...register('toWarehouseId', { required: true })}>
                  <option value="">Seçin...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Anbar *</label>
              <select className={inputCls} {...register('warehouseId', { required: true })}>
                <option value="">Seçin...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Miqdar *</label>
              <input type="number" step="0.001" className={inputCls} {...register('quantity', { required: true })} />
            </div>
            {modal === 'in' && (
              <div>
                <label className={labelCls}>Vahid qiymət (₼)</label>
                <input type="number" step="0.01" className={inputCls} {...register('unitPrice')} />
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Qeyd</label>
            <input className={inputCls} {...register('note')} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Təsdiqlə
          </button>
        </form>
      </Modal>
    </div>
  );
}
