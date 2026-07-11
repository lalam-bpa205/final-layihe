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
  SkeletonRows,
  Tabs,
} from '../../components/ui';
import { MovementTypeBadge, SignedQty, fmtDateTime } from './inventoryShared';

const PANEL_TITLES = {
  in: 'Stok girişi',
  out: 'Stok çıxışı',
  transfer: 'Anbarlar arası transfer',
};

export default function StockPage() {
  const [tab, setTab] = useState('movements');
  const [movements, setMovements] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [panel, setPanel] = useState(null); // 'in' | 'out' | 'transfer'
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  const loadMovements = useCallback(() => {
    setMovementsLoading(true);
    api
      .get('/stock/movements', { params: { page, pageSize: 10 } })
      .then(({ data }) => setMovements(data))
      .catch(() => notify.error('Stok hərəkətləri yüklənə bilmədi.'))
      .finally(() => setMovementsLoading(false));
  }, [page]);

  const loadLevels = useCallback(() => {
    setLevelsLoading(true);
    api
      .get('/stock/levels')
      .then(({ data }) => setLevels(data))
      .catch(() => notify.error('Stok qalıqları yüklənə bilmədi.'))
      .finally(() => setLevelsLoading(false));
  }, []);

  useEffect(() => {
    loadMovements();
    loadLevels();
  }, [loadMovements, loadLevels]);

  useEffect(() => {
    api.get('/products', { params: { pageSize: 100 } }).then(({ data }) => setProducts(data.items));
    api.get('/warehouses').then(({ data }) => setWarehouses(data));
  }, []);

  const openPanel = (type) => {
    reset({
      productId: '', warehouseId: '', fromWarehouseId: '', toWarehouseId: '',
      quantity: '', unitPrice: '', note: '',
    });
    setError(null);
    setPanel(type);
  };

  const onSubmit = async (values) => {
    try {
      if (panel === 'in') {
        await api.post('/stock/in', {
          productId: Number(values.productId),
          warehouseId: Number(values.warehouseId),
          quantity: Number(values.quantity),
          unitPrice: values.unitPrice ? Number(values.unitPrice) : null,
          note: values.note || null,
        });
        notify.success('Stok girişi qeydə alındı.');
      } else if (panel === 'out') {
        await api.post('/stock/out', {
          productId: Number(values.productId),
          warehouseId: Number(values.warehouseId),
          quantity: Number(values.quantity),
          note: values.note || null,
        });
        notify.success('Stok çıxışı qeydə alındı.');
      } else {
        await api.post('/stock/transfer', {
          productId: Number(values.productId),
          fromWarehouseId: Number(values.fromWarehouseId),
          toWarehouseId: Number(values.toWarehouseId),
          quantity: Number(values.quantity),
          note: values.note || null,
        });
        notify.success('Transfer tamamlandı.');
      }
      setPanel(null);
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

  return (
    <div>
      <PageHeader
        title="Stok idarəetməsi"
        description="Giriş, çıxış və transferlər — bütün stok hərəkətlərinin qeydiyyatı"
        actions={
          <>
            <Button onClick={() => openPanel('in')}>+ Giriş</Button>
            <Button
              variant="secondary"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => openPanel('out')}
            >
              − Çıxış
            </Button>
            <Button variant="secondary" onClick={() => openPanel('transfer')}>
              ⇄ Transfer
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-4"
        tabs={[
          { key: 'movements', label: 'Hərəkətlər', icon: '🕘', count: movements.totalCount },
          { key: 'levels', label: 'Qalıqlar', icon: '📊', count: levels.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'movements' ? (
        <>
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məhsul</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Anbar</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Növ</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Miqdar</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Qeyd</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Kim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movementsLoading ? (
                  <SkeletonRows rows={6} cols={7} />
                ) : (
                  movements.items.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap tabular-nums">
                        {fmtDateTime(m.createdDate)}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-800">{m.productName}</td>
                      <td className="px-6 py-3.5 text-slate-600">{m.warehouseName}</td>
                      <td className="px-6 py-3.5">
                        <MovementTypeBadge type={m.type} />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <SignedQty type={m.type} quantity={m.quantity} />
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 max-w-40 truncate">
                        {m.note || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{m.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!movementsLoading && movements.items.length === 0 && (
              <EmptyState
                icon="🕘"
                title="Hələ stok hərəkəti yoxdur"
                description="Giriş, çıxış və ya transfer edərək stok hərəkətlərini qeydə alın."
                action={<Button onClick={() => openPanel('in')}>+ İlk girişi et</Button>}
              />
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <span>Cəmi: {movements.totalCount} hərəkət</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Əvvəlki
              </Button>
              <span className="px-1 tabular-nums">
                Səhifə {movements.page} / {Math.max(movements.totalPages, 1)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= movements.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Növbəti →
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məhsul</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Anbar</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Qalıq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {levelsLoading ? (
                <SkeletonRows rows={6} cols={3} />
              ) : (
                levels.map((l, i) => (
                  <tr key={i} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-3.5 font-medium text-slate-800">{l.productName}</td>
                    <td className="px-6 py-3.5 text-slate-600">{l.warehouseName}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">
                      {l.quantity} {l.unit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!levelsLoading && levels.length === 0 && (
            <EmptyState
              icon="📊"
              title="Anbarlarda qalıq yoxdur"
              description="Stok girişi etdikdən sonra qalıqlar burada görünəcək."
              action={<Button onClick={() => openPanel('in')}>+ İlk girişi et</Button>}
            />
          )}
        </div>
      )}

      <SlideOver
        open={Boolean(panel)}
        title={PANEL_TITLES[panel] ?? ''}
        subtitle="Əməliyyat təsdiqləndikdən sonra qalıqlar avtomatik yenilənəcək"
        onClose={() => setPanel(null)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Məhsul" required {...register('productId', { required: true })}>
            <option value="">Seçin...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.barcode})
              </option>
            ))}
          </Select>

          {panel === 'transfer' ? (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Göndərən anbar" required {...register('fromWarehouseId', { required: true })}>
                <option value="">Seçin...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
              <Select label="Qəbul edən anbar" required {...register('toWarehouseId', { required: true })}>
                <option value="">Seçin...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
          ) : (
            <Select label="Anbar" required {...register('warehouseId', { required: true })}>
              <option value="">Seçin...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Miqdar"
              required
              type="number"
              step="0.001"
              min="0"
              {...register('quantity', { required: true })}
            />
            {panel === 'in' && (
              <Input
                label="Vahid qiymət (₼)"
                type="number"
                step="0.01"
                min="0"
                {...register('unitPrice')}
              />
            )}
          </div>
          <Input label="Qeyd" placeholder="Əməliyyat barədə qeyd..." {...register('note')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Təsdiqlə
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
