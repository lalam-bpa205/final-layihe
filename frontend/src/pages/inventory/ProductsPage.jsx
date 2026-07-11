import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';
import { fmtMoney } from './inventoryShared';

export default function ProductsPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

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
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (lowStockOnly) params.lowStockOnly = true;
    setLoading(true);
    api
      .get('/products', { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('Məhsullar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
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
    setPanelOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    reset({
      name: p.name, barcode: p.barcode, description: p.description ?? '',
      unit: p.unit, purchasePrice: p.purchasePrice, salePrice: p.salePrice,
      minStockLevel: p.minStockLevel, categoryId: p.categoryId,
    });
    setError(null);
    setPanelOpen(true);
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
      setPanelOpen(false);
      notify.success(editing ? 'Məhsul məlumatları yeniləndi.' : 'Yeni məhsul əlavə olundu.');
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
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/products/${deleting.id}`);
      notify.success('Məhsul silindi.');
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasFilters = Boolean(search || categoryId || lowStockOnly);

  return (
    <div>
      <PageHeader
        title="Məhsullar"
        description="Anbardakı məhsulların siyahısı, axtarış və idarəetmə"
        actions={<Button onClick={openCreate}>+ Yeni məhsul</Button>}
      />

      {/* Filtrlər */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-80 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            placeholder="Ad və ya barkod üzrə axtar..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          className="w-52"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">Bütün kateqoriyalar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
          />
          Yalnız az stoklu
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məhsul</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Barkod</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Kateqoriya</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Alış</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Satış</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Stok</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={7} />
            ) : (
              result.items.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/inventory/products/${p.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-slate-800 truncate max-w-56">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-slate-400 truncate max-w-56">{p.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{p.barcode}</td>
                  <td className="px-6 py-3.5 text-slate-600">{p.categoryName}</td>
                  <td className="px-6 py-3.5 text-right text-slate-700 tabular-nums whitespace-nowrap">
                    {fmtMoney(p.purchasePrice)}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-700 tabular-nums whitespace-nowrap">
                    {fmtMoney(p.salePrice)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Badge tone={p.isLowStock ? 'red' : 'green'}>
                      {p.currentStock} {p.unit}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(p)}
                      >
                        Sil
                      </Button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && result.items.length === 0 && (
          <EmptyState
            icon="📦"
            title={hasFilters ? 'Nəticə tapılmadı' : 'Hələ məhsul yoxdur'}
            description={
              hasFilters
                ? 'Axtarış və ya filtr şərtlərinə uyğun məhsul tapılmadı.'
                : 'İlk məhsulu əlavə edərək anbarı doldurmağa başlayın.'
            }
            action={!hasFilters && <Button onClick={openCreate}>+ Yeni məhsul</Button>}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} məhsul</span>
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
        title={editing ? 'Məhsulu redaktə et' : 'Yeni məhsul'}
        subtitle={editing ? editing.name : 'Yeni məhsulun məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Ad" required {...register('name', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Barkod" required {...register('barcode', { required: true })} />
            <Select label="Kateqoriya" required {...register('categoryId', { required: true })}>
              <option value="">Seçin...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Alış qiyməti (₼)"
              required
              type="number"
              step="0.01"
              min="0"
              {...register('purchasePrice', { required: true })}
            />
            <Input
              label="Satış qiyməti (₼)"
              required
              type="number"
              step="0.01"
              min="0"
              {...register('salePrice', { required: true })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ölçü vahidi" required {...register('unit', { required: true })} />
            <Input
              label="Minimum stok"
              type="number"
              step="0.001"
              min="0"
              {...register('minStockLevel')}
            />
          </div>
          <Textarea label="Təsvir" rows={2} placeholder="Məhsul barədə qeyd..." {...register('description')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Məhsulu sil"
        message={
          deleting
            ? `"${deleting.name}" məhsulunu silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
            : ''
        }
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
