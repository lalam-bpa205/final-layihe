import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  Tabs,
} from '../../components/ui';
import { fmtMoney, fmtDate } from './transportShared';

export default function VehicleLogsPage() {
  const [tab, setTab] = useState('fuel');
  const [fuel, setFuel] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [panel, setPanel] = useState(null); // 'fuel' | 'maintenance'
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(() => {
    const params = vehicleFilter ? { vehicleId: vehicleFilter } : {};
    setLoading(true);
    Promise.all([
      api.get('/fuel-records', { params }).then(({ data }) => setFuel(data)),
      api.get('/maintenance-records', { params }).then(({ data }) => setMaintenance(data)),
    ])
      .catch(() => notify.error('Qeydlər yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [vehicleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/vehicles').then(({ data }) => setVehicles(data));
    api.get('/drivers').then(({ data }) => setDrivers(data));
  }, []);

  const openPanel = (type) => {
    reset({
      vehicleId: vehicleFilter || '', driverId: '', date: new Date().toISOString().slice(0, 10),
      liters: '', cost: '', odometerKm: '', note: '', description: '', nextDueDate: '',
    });
    setError(null);
    setPanel(type);
  };

  const onSubmit = async (values) => {
    try {
      if (panel === 'fuel') {
        await api.post('/fuel-records', {
          vehicleId: Number(values.vehicleId),
          driverId: values.driverId ? Number(values.driverId) : null,
          date: values.date,
          liters: Number(values.liters),
          cost: Number(values.cost),
          odometerKm: values.odometerKm ? Number(values.odometerKm) : null,
          note: values.note || null,
        });
        notify.success('Yanacaq qeydi əlavə olundu.');
      } else {
        await api.post('/maintenance-records', {
          vehicleId: Number(values.vehicleId),
          date: values.date,
          description: values.description,
          cost: Number(values.cost),
          nextDueDate: values.nextDueDate || null,
        });
        notify.success('Təmir qeydi əlavə olundu.');
      }
      setPanel(null);
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

  return (
    <div>
      <PageHeader
        title="Yanacaq və Təmir"
        description="Avtomobil parkı üzrə yanacaq və texniki xidmət qeydləri"
        actions={
          <>
            <Button onClick={() => openPanel('fuel')}>+ Yanacaq qeydi</Button>
            <Button variant="secondary" onClick={() => openPanel('maintenance')}>
              + Təmir qeydi
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <Tabs
          className="flex-1 min-w-0"
          tabs={[
            { key: 'fuel', label: 'Yanacaq', icon: '⛽', count: fuel.length },
            { key: 'maintenance', label: 'Təmir', icon: '🔧', count: maintenance.length },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Select
          className="w-52"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="">Bütün avtomobillər</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.plateNumber}</option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        {tab === 'fuel' ? (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Avtomobil</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Sürücü</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Litr</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Odometr</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Qeyd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows rows={6} cols={7} />
                ) : (
                  fuel.map((f) => (
                    <tr key={f.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 tabular-nums">
                        {fmtDate(f.date)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{f.vehiclePlate}</td>
                      <td className="px-6 py-3.5 text-slate-600">{f.driverName || '—'}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">
                        {Number(f.liters ?? 0).toLocaleString('az-AZ')}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <Badge tone="blue" dot={false}>{fmtMoney(f.cost)}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-500">
                        {f.odometerKm != null ? `${Number(f.odometerKm).toLocaleString('az-AZ')} km` : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 max-w-48 truncate">{f.note || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && fuel.length === 0 && (
              <EmptyState
                icon="⛽"
                title="Yanacaq qeydi yoxdur"
                description="Seçilmiş filtr üzrə yanacaq qeydi tapılmadı."
                action={<Button onClick={() => openPanel('fuel')}>+ Yanacaq qeydi</Button>}
              />
            )}
          </>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Avtomobil</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Təsvir</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Növbəti baxış</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows rows={6} cols={5} />
                ) : (
                  maintenance.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 tabular-nums">
                        {fmtDate(m.date)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{m.vehiclePlate}</td>
                      <td className="px-6 py-3.5 text-slate-700 max-w-72 truncate" title={m.description}>
                        {m.description}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <Badge tone="yellow" dot={false}>{fmtMoney(m.cost)}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 tabular-nums">
                        {m.nextDueDate ? fmtDate(m.nextDueDate) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && maintenance.length === 0 && (
              <EmptyState
                icon="🔧"
                title="Təmir qeydi yoxdur"
                description="Seçilmiş filtr üzrə təmir qeydi tapılmadı."
                action={
                  <Button onClick={() => openPanel('maintenance')}>+ Təmir qeydi</Button>
                }
              />
            )}
          </>
        )}
      </div>

      <SlideOver
        open={Boolean(panel)}
        title={panel === 'fuel' ? 'Yanacaq qeydi' : 'Təmir qeydi'}
        subtitle={panel === 'fuel' ? 'Yanacaq doldurma məlumatları' : 'Texniki xidmət məlumatları'}
        onClose={() => setPanel(null)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Avtomobil" required {...register('vehicleId', { required: true })}>
              <option value="">Seçin...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plateNumber}</option>
              ))}
            </Select>
            <Input label="Tarix" required type="date" {...register('date', { required: true })} />
          </div>

          {panel === 'fuel' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Litr"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('liters', { required: true })}
                />
                <Input
                  label="Məbləğ (₼)"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('cost', { required: true })}
                />
                <Input label="Odometr (km)" type="number" min="0" {...register('odometerKm')} />
              </div>
              <Select label="Sürücü" {...register('driverId')}>
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </Select>
              <Input label="Qeyd" placeholder="Əməliyyat barədə qeyd..." {...register('note')} />
            </>
          ) : (
            <>
              <Textarea
                label="Təsvir"
                required
                rows={2}
                placeholder="Yağ dəyişimi, əyləc bəndi..."
                {...register('description', { required: true })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Məbləğ (₼)"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('cost', { required: true })}
                />
                <Input label="Növbəti baxış" type="date" {...register('nextDueDate')} />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
