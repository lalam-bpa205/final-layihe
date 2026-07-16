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
  ConfirmDialog,
} from '../../components/ui';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = () => {
    setLoading(true);
    api
      .get('/warehouses')
      .then(({ data }) => setWarehouses(data))
      .catch(() => notify.error('Anbarlar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api
      .get('/employees', { params: { pageSize: 200 } })
      .then(({ data }) => setEmployees(data.items))
      .catch(() => notify.error('İşçi siyahısı yüklənə bilmədi.'));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', location: '', keeperId: '' });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    reset({ name: w.name, location: w.location ?? '', keeperId: w.keeperId ?? '' });
    setError(null);
    setPanelOpen(true);
  };

  // İşçi başqa anbarın anbardarıdırsa onun adını qaytarır (redaktə edilən anbar sayılmır).
  const keeperOf = (employeeId) =>
    warehouses.find((w) => w.keeperId === employeeId && w.id !== editing?.id)?.name ?? null;

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      location: values.location || null,
      keeperId: values.keeperId ? Number(values.keeperId) : null,
    };
    try {
      if (editing) await api.put(`/warehouses/${editing.id}`, payload);
      else await api.post('/warehouses', payload);
      setPanelOpen(false);
      notify.success(editing ? 'Anbar məlumatları yeniləndi.' : 'Yeni anbar əlavə olundu.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/warehouses/${deleting.id}`);
      notify.success('Anbar silindi.');
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Anbarlar"
        description="Stokun saxlanıldığı anbarlar və onların ünvanları"
        actions={<Button onClick={openCreate}>+ Yeni anbar</Button>}
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Ad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Ünvan</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Anbardar</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={4} cols={4} />
            ) : (
              warehouses.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    <span className="mr-2" aria-hidden="true">🏭</span>
                    {w.name}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{w.location || '—'}</td>
                  <td className="px-6 py-3.5">
                    {w.keeperName ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.keeperName} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{w.keeperName}</p>
                          <p className="truncate text-xs text-slate-400">
                            {w.keeperPosition}
                            {w.keeperPhone ? ` · ${w.keeperPhone}` : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        Təyin olunmayıb
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(w)}
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
        {!loading && warehouses.length === 0 && (
          <EmptyState
            icon="🏭"
            title="Hələ anbar yoxdur"
            description="İlk anbarı əlavə edərək stok idarəetməsinə başlayın."
            action={<Button onClick={openCreate}>+ Yeni anbar</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Anbarı redaktə et' : 'Yeni anbar'}
        subtitle={editing ? editing.name : 'Yeni anbarın məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Ad" required {...register('name', { required: true })} />
          <Input label="Ünvan" placeholder="Anbarın yerləşdiyi ünvan" {...register('location')} />

          <Select label="Anbardar" {...register('keeperId')}>
            <option value="">Təyin olunmayıb</option>
            {employees.map((e) => {
              const busyAt = keeperOf(e.id);
              return (
                <option key={e.id} value={e.id} disabled={Boolean(busyAt)}>
                  {e.firstName} {e.lastName} — {e.positionTitle}
                  {busyAt ? ` (${busyAt} anbarındadır)` : ''}
                </option>
              );
            })}
          </Select>
          <p className="-mt-2 text-xs text-slate-400">
            Bir işçi eyni anda yalnız bir anbara cavabdeh ola bilər.
          </p>

          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Anbarı sil"
        message={
          deleting
            ? `"${deleting.name}" anbarını silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
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
