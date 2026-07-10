import { notify } from '../../notify';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

export default function ProductsPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (lowStockOnly) params.lowStockOnly = true;
    api.get('/products', { params }).then(({ data }) => setResult(data));
  }, [page, search, categoryId, lowStockOnly]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({
      name: '', barcode: '', description: '', unit: 'ədəd',
      purchasePrice: '', salePrice: '', minStockLevel: 0, categoryId: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    reset({
      name: p.name, barcode: p.barcode, description: p.description ?? '',
      unit: p.unit, purchasePrice: p.purchasePrice, salePrice: p.salePrice,
      minStockLevel: p.minStockLevel, categoryId: p.categoryId,
    });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      purchasePrice: Number(values.purchasePrice),
      salePrice: Number(values.salePrice),
      minStockLevel: Number(values.minStockLevel),
      categoryId: Number(values.categoryId),
      description: values.description || null,
    };
    try {
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
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

  const onDelete = async (p) => {
    if (!confirm(`"${p.name}" məhsulunu silmək istədiyinizə əminsiniz?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Məhsullar</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni məhsul
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          placeholder="Ad və ya barkod üzrə axtar..."
          className="rounded-lg border border-slate-300 px-3 py-2 w-72"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">Bütün kateqoriyalar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
          />
          Yalnız az stoklu
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Məhsul</th>
              <th className="text-left px-6 py-3 font-semibold">Barkod</th>
              <th className="text-left px-6 py-3 font-semibold">Kateqoriya</th>
              <th className="text-right px-6 py-3 font-semibold">Alış</th>
              <th className="text-right px-6 py-3 font-semibold">Satış</th>
              <th className="text-right px-6 py-3 font-semibold">Stok</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-6 py-3 text-slate-500 font-mono text-xs">{p.barcode}</td>
                <td className="px-6 py-3">{p.categoryName}</td>
                <td className="px-6 py-3 text-right">{p.purchasePrice.toFixed(2)} ₼</td>
                <td className="px-6 py-3 text-right">{p.salePrice.toFixed(2)} ₼</td>
                <td className="px-6 py-3 text-right">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}
                    title={p.isLowStock ? 'Stok minimum səviyyədən aşağıdır!' : ''}
                  >
                    {p.currentStock} {p.unit}
                  </span>
                </td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline">
                    Redaktə
                  </button>
                  <button onClick={() => onDelete(p)} className="text-red-600 hover:underline">
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  Məhsul tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} məhsul</span>
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

      <Modal
        open={modalOpen}
        title={editing ? 'Məhsulu redaktə et' : 'Yeni məhsul'}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Ad *</label>
            <input className={inputCls} {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Barkod *</label>
              <input className={inputCls} {...register('barcode', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Kateqoriya *</label>
              <select className={inputCls} {...register('categoryId', { required: true })}>
                <option value="">Seçin...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Alış qiyməti (₼) *</label>
              <input type="number" step="0.01" className={inputCls} {...register('purchasePrice', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Satış qiyməti (₼) *</label>
              <input type="number" step="0.01" className={inputCls} {...register('salePrice', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ölçü vahidi *</label>
              <input className={inputCls} {...register('unit', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Minimum stok</label>
              <input type="number" step="0.001" className={inputCls} {...register('minStockLevel')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Təsvir</label>
            <textarea rows={2} className={inputCls} {...register('description')} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
