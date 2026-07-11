import { useEffect, useState } from 'react';
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
import { VEHICLE_TYPES, VehicleStatusBadge } from './transportShared';

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null); // { vehicle, status }
  const [statusLoading, setStatusLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = () => {
    setLoading(true);
    api
      .get('/vehicles')
      .then(({ data }) => setVehicles(data))
      .catch(() => notify.error('Avtomobillər yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({
      plateNumber: '', brand: '', model: '',
      year: new Date().getFullYear(), type: '1', capacityKg: '',
    });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    reset({
      plateNumber: v.plateNumber, brand: v.brand, model: v.model,
      year: v.year, type: v.type, capacityKg: v.capacityKg,
    });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      year: Number(values.year),
      type: Number(values.type),
      capacityKg: Number(values.capacityKg),
    };
    try {
      if (editing) await api.put(`/vehicles/${editing.id}`, payload);
      else await api.post('/vehicles', payload);
      setPanelOpen(false);
      notify.success(editing ? 'Avtomobil məlumatları yeniləndi.' : 'Yeni avtomobil əlavə olundu.');
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

  const confirmStatus = async () => {
    if (!pendingStatus) return;
    setStatusLoading(true);
    try {
      await api.post(`/vehicles/${pendingStatus.vehicle.id}/status`, pendingStatus.status, {
        headers: { 'Content-Type': 'application/json' },
      });
      notify.success('Avtomobilin statusu yeniləndi.');
      setPendingStatus(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setStatusLoading(false);
    }
  };

  const toMaintenance = pendingStatus?.status === 3;

  return (
    <div>
      <PageHeader
        title="Avtomobillər"
        description="Avtomobil parkının siyahısı və idarəetmə"
        actions={<Button onClick={openCreate}>+ Yeni avtomobil</Button>}
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Nömrə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Marka / Model</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İl</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Növ</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tutum (kq)</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={5} cols={7} />
            ) : (
              vehicles.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/transport/vehicles/${v.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5 font-mono font-semibold text-slate-800">{v.plateNumber}</td>
                  <td className="px-6 py-3.5 text-slate-700">{v.brand} {v.model}</td>
                  <td className="px-6 py-3.5 text-slate-500 tabular-nums">{v.year}</td>
                  <td className="px-6 py-3.5 text-slate-600">{VEHICLE_TYPES[v.type] ?? v.type}</td>
                  <td className="px-6 py-3.5 text-right text-slate-700 tabular-nums">
                    {v.capacityKg.toLocaleString('az-AZ')}
                  </td>
                  <td className="px-6 py-3.5">
                    <VehicleStatusBadge status={v.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      {v.status === 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          onClick={() => setPendingStatus({ vehicle: v, status: 3 })}
                        >
                          Təmirə göndər
                        </Button>
                      )}
                      {v.status === 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => setPendingStatus({ vehicle: v, status: 1 })}
                        >
                          Təmirdən qaytar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>
                        Redaktə
                      </Button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && vehicles.length === 0 && (
          <EmptyState
            icon="🚛"
            title="Hələ avtomobil yoxdur"
            description="İlk avtomobili əlavə edərək parkı formalaşdırın."
            action={<Button onClick={openCreate}>+ Yeni avtomobil</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Avtomobili redaktə et' : 'Yeni avtomobil'}
        subtitle={editing ? editing.plateNumber : 'Yeni avtomobilin məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dövlət nömrəsi"
              required
              placeholder="10-AB-123"
              {...register('plateNumber', { required: true })}
            />
            <Select label="Növ" required {...register('type', { required: true })}>
              {Object.entries(VEHICLE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Marka" required placeholder="Mercedes" {...register('brand', { required: true })} />
            <Input label="Model" required placeholder="Actros" {...register('model', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Buraxılış ili" required type="number" {...register('year', { required: true })} />
            <Input
              label="Yük tutumu (kq)"
              required
              type="number"
              step="0.01"
              min="0"
              {...register('capacityKg', { required: true })}
            />
          </div>
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={toMaintenance ? 'Təmirə göndər' : 'Təmirdən qaytar'}
        message={
          pendingStatus
            ? toMaintenance
              ? `${pendingStatus.vehicle.plateNumber} təmirə göndərilsin? Status "Təmirdə" olacaq.`
              : `${pendingStatus.vehicle.plateNumber} təmirdən qaytarılsın? Status "Aktiv" olacaq.`
            : ''
        }
        confirmText={toMaintenance ? 'Təmirə göndər' : 'Qaytar'}
        danger={false}
        loading={statusLoading}
        onConfirm={confirmStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}
