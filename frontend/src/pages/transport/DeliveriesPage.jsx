import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  DELIVERY_STATUS,
  DELIVERY_ACTIONS,
  DeliveryStatusBadge,
  fmtDate,
} from './transportShared';

export default function DeliveriesPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null); // { delivery, action }
  const [actionLoading, setActionLoading] = useState(false);

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
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    setLoading(true);
    api
      .get('/deliveries', { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('Çatdırılmalar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRefs = useCallback(() => {
    api.get('/vehicles').then(({ data }) => setVehicles(data));
    api.get('/drivers').then(({ data }) => setDrivers(data));
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  const openCreate = () => {
    reset({
      customerName: '', fromAddress: '', toAddress: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      vehicleId: '', driverId: '', cargoDescription: '', cargoWeightKg: '', note: '',
    });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      vehicleId: Number(values.vehicleId),
      driverId: Number(values.driverId),
      cargoWeightKg: values.cargoWeightKg ? Number(values.cargoWeightKg) : null,
      cargoDescription: values.cargoDescription || null,
      note: values.note || null,
    };
    try {
      await api.post('/deliveries', payload);
      setPanelOpen(false);
      notify.success('Yeni çatdırılma yaradıldı.');
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
    if (!pending) return;
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${pending.delivery.id}/${pending.action}`);
      notify.success(DELIVERY_ACTIONS[pending.action].success);
      setPending(null);
      load();
      loadRefs();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilters = Boolean(search || statusFilter);
  const pendingCfg = pending ? DELIVERY_ACTIONS[pending.action] : null;

  return (
    <div>
      <PageHeader
        title="Çatdırılmalar"
        description="Çatdırılma sifarişləri, statuslar və əməliyyatlar"
        actions={<Button onClick={openCreate}>+ Yeni çatdırılma</Button>}
      />

      {/* Filtrlər */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-80 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            placeholder="Nömrə, müştəri və ya ünvan üzrə axtar..."
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
          {Object.entries(DELIVERY_STATUS).map(([value, s]) => (
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
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Marşrut</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Avtomobil</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Sürücü</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={8} />
            ) : (
              result.items.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/transport/deliveries/${d.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5 font-mono font-semibold text-slate-800">{d.number}</td>
                  <td className="px-6 py-3.5 text-slate-700">{d.customerName}</td>
                  <td
                    className="px-6 py-3.5 text-slate-500 max-w-56 truncate"
                    title={`${d.fromAddress} → ${d.toAddress}`}
                  >
                    {d.fromAddress} → {d.toAddress}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 tabular-nums">
                    {fmtDate(d.scheduledDate)}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{d.vehiclePlate}</td>
                  <td className="px-6 py-3.5 text-slate-600">{d.driverName}</td>
                  <td className="px-6 py-3.5">
                    <DeliveryStatusBadge status={d.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      {d.status === 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                            onClick={() => setPending({ delivery: d, action: 'start' })}
                          >
                            Yola sal
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setPending({ delivery: d, action: 'cancel' })}
                          >
                            Ləğv et
                          </Button>
                        </>
                      )}
                      {d.status === 2 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => setPending({ delivery: d, action: 'complete' })}
                          >
                            Tamamla
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setPending({ delivery: d, action: 'cancel' })}
                          >
                            Ləğv et
                          </Button>
                        </>
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
            icon="🚚"
            title={hasFilters ? 'Nəticə tapılmadı' : 'Hələ çatdırılma yoxdur'}
            description={
              hasFilters
                ? 'Axtarış və ya filtr şərtlərinə uyğun çatdırılma tapılmadı.'
                : 'İlk çatdırılma sifarişini yaradaraq başlayın.'
            }
            action={!hasFilters && <Button onClick={openCreate}>+ Yeni çatdırılma</Button>}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} çatdırılma</span>
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
        title="Yeni çatdırılma"
        subtitle="Çatdırılma sifarişinin məlumatları"
        onClose={() => setPanelOpen(false)}
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
              label="Haradan"
              required
              placeholder="Bakı, ..."
              {...register('fromAddress', { required: true })}
            />
            <Input
              label="Haraya"
              required
              placeholder="Gəncə, ..."
              {...register('toAddress', { required: true })}
            />
          </div>
          <Input label="Tarix" required type="date" {...register('scheduledDate', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Avtomobil" required {...register('vehicleId', { required: true })}>
              <option value="">Seçin...</option>
              {vehicles.filter((v) => v.status === 1).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} ({v.capacityKg} kq)
                </option>
              ))}
            </Select>
            <Select label="Sürücü" required {...register('driverId', { required: true })}>
              <option value="">Seçin...</option>
              {drivers.filter((d) => d.status === 1).map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Yük təsviri" {...register('cargoDescription')} />
            <Input label="Yük çəkisi (kq)" type="number" step="0.01" min="0" {...register('cargoWeightKg')} />
          </div>
          <Input label="Qeyd" placeholder="Sifariş barədə qeyd..." {...register('note')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pendingCfg?.title}
        message={pending ? pendingCfg.message(pending.delivery) : ''}
        confirmText={pendingCfg?.confirmText}
        danger={pendingCfg?.danger}
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
