import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Avatar,
  Button,
  Input,
  Select,
  SlideOver,
  EmptyState,
  SkeletonRows,
} from '../../components/ui';
import { DriverStatusBadge, fmtDate } from './transportShared';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = () => {
    setLoading(true);
    api
      .get('/drivers')
      .then(({ data }) => setDrivers(data))
      .catch(() => notify.error('Sürücülər yüklənə bilmədi.'))
      .finally(() => setLoading(false));
    api.get('/drivers/expiring-licenses').then(({ data }) => setExpiring(data));
  };

  useEffect(() => {
    load();
    api.get('/employees', { params: { pageSize: 100 } })
      .then(({ data }) => setEmployees(data.items));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ employeeId: '', licenseNumber: '', licenseCategories: '', licenseExpiryDate: '' });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    reset({
      employeeId: d.employeeId,
      licenseNumber: d.licenseNumber,
      licenseCategories: d.licenseCategories,
      licenseExpiryDate: d.licenseExpiryDate,
    });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = { ...values, employeeId: Number(values.employeeId) };
    try {
      if (editing) await api.put(`/drivers/${editing.id}`, payload);
      else await api.post('/drivers', payload);
      setPanelOpen(false);
      notify.success(editing ? 'Sürücü məlumatları yeniləndi.' : 'Yeni sürücü əlavə olundu.');
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

  const expiringIds = new Set(expiring.map((d) => d.id));

  return (
    <div>
      <PageHeader
        title="Sürücülər"
        description="Sürücü heyəti, vəsiqələr və statuslar"
        actions={<Button onClick={openCreate}>+ Yeni sürücü</Button>}
      />

      {/* Vəsiqə xəbərdarlığı */}
      {expiring.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
          ⚠️ <b>{expiring.length}</b> sürücünün vəsiqəsinin müddəti 30 gün ərzində bitir:{' '}
          {expiring.map((d) => `${d.fullName} (${fmtDate(d.licenseExpiryDate)})`).join(', ')}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Sürücü</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Telefon</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Vəsiqə №</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Kateqoriyalar</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Etibarlıdır</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={5} cols={7} withAvatar />
            ) : (
              drivers.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={d.fullName} />
                      <p className="font-medium text-slate-800">{d.fullName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 tabular-nums">{d.phone || '—'}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{d.licenseNumber}</td>
                  <td className="px-6 py-3.5 text-slate-600">{d.licenseCategories}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap tabular-nums">
                    <span
                      className={
                        expiringIds.has(d.id) ? 'text-amber-700 font-semibold' : 'text-slate-500'
                      }
                    >
                      {fmtDate(d.licenseExpiryDate)} {expiringIds.has(d.id) && '⚠️'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <DriverStatusBadge status={d.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                      Redaktə
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && drivers.length === 0 && (
          <EmptyState
            icon="🧑‍✈️"
            title="Hələ sürücü yoxdur"
            description="Sürücü əlavə etmək üçün əvvəlcə HR modulunda işçi yaradın, sonra onu sürücü kimi qeydiyyata alın."
            action={<Button onClick={openCreate}>+ Yeni sürücü</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Sürücünü redaktə et' : 'Yeni sürücü'}
        subtitle={editing ? editing.fullName : 'Yeni sürücünün məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Select
              label="İşçi"
              required
              disabled={!!editing}
              {...register('employeeId', { required: true })}
            >
              <option value="">Seçin...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} — {e.positionTitle}
                </option>
              ))}
            </Select>
            {editing && (
              <p className="mt-1 text-xs text-slate-400">İşçi bağlantısı dəyişdirilə bilməz.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vəsiqə nömrəsi"
              required
              placeholder="AB1234567"
              {...register('licenseNumber', { required: true })}
            />
            <Input
              label="Kateqoriyalar"
              required
              placeholder="B, C, CE"
              {...register('licenseCategories', { required: true })}
            />
          </div>
          <Input
            label="Vəsiqənin bitmə tarixi"
            required
            type="date"
            {...register('licenseExpiryDate', { required: true })}
          />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
