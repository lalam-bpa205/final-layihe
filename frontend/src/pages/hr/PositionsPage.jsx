import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = () =>
    api
      .get('/positions')
      .then(({ data }) => setPositions(data))
      .catch(() => notify.error('Vəzifələr yüklənə bilmədi.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    api.get('/departments').then(({ data }) => setDepartments(data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ title: '', description: '', departmentId: '' });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    reset({ title: p.title, description: p.description ?? '', departmentId: p.departmentId });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = { ...values, departmentId: Number(values.departmentId) };
    try {
      if (editing) await api.put(`/positions/${editing.id}`, payload);
      else await api.post('/positions', payload);
      setPanelOpen(false);
      notify.success(editing ? 'Vəzifə yeniləndi.' : 'Yeni vəzifə yaradıldı.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/positions/${deleting.id}`);
      notify.success('Vəzifə silindi.');
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
        title="Vəzifələr"
        description="Şöbələr üzrə vəzifə adları və işçi bölgüsü"
        actions={<Button onClick={openCreate}>+ Yeni vəzifə</Button>}
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Vəzifə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Şöbə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşçi sayı</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={5} cols={4} />
            ) : (
              positions.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-base">
                        💼
                      </span>
                      <span className="font-medium text-slate-800">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{p.departmentName}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                      {p.employeeCount} nəfər
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1">
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
        {!loading && positions.length === 0 && (
          <EmptyState
            icon="💼"
            title="Hələ vəzifə yoxdur"
            description="İlk vəzifəni yaradaraq işçiləri təyin etməyə başlayın."
            action={<Button onClick={openCreate}>+ Yeni vəzifə</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Vəzifəni redaktə et' : 'Yeni vəzifə'}
        subtitle={editing ? editing.title : 'Yeni vəzifə məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Vəzifə adı" required {...register('title', { required: true })} />
          <Select label="Şöbə" required {...register('departmentId', { required: true })}>
            <option value="">Seçin...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Textarea label="Təsvir" placeholder="Vəzifənin öhdəlikləri..." {...register('description')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Vəzifəni sil"
        message={deleting ? `"${deleting.title}" vəzifəsini silmək istədiyinizə əminsiniz?` : ''}
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
