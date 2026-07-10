import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';

export default function DepartmentsPage() {
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
      .get('/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => notify.error('Şöbələr yüklənə bilmədi.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    reset({ name: d.name, description: d.description ?? '' });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editing) await api.put(`/departments/${editing.id}`, values);
      else await api.post('/departments', values);
      setPanelOpen(false);
      notify.success(editing ? 'Şöbə yeniləndi.' : 'Yeni şöbə yaradıldı.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/departments/${deleting.id}`);
      notify.success('Şöbə silindi.');
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
        title="Şöbələr"
        description="Şirkətin struktur bölmələri və işçi sayları"
        actions={<Button onClick={openCreate}>+ Yeni şöbə</Button>}
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Ad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Təsvir</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşçi sayı</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={5} cols={4} />
            ) : (
              departments.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-base">
                        🏢
                      </span>
                      <span className="font-medium text-slate-800">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{d.description || '—'}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                      {d.employeeCount} nəfər
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(d)}
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
        {!loading && departments.length === 0 && (
          <EmptyState
            icon="🏢"
            title="Hələ şöbə yoxdur"
            description="İlk şöbəni yaradaraq şirkət strukturunu qurmağa başlayın."
            action={<Button onClick={openCreate}>+ Yeni şöbə</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Şöbəni redaktə et' : 'Yeni şöbə'}
        subtitle={editing ? editing.name : 'Yeni struktur bölməsi'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Ad" required {...register('name', { required: true })} />
          <Textarea label="Təsvir" placeholder="Şöbənin funksiyası..." {...register('description')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Şöbəni sil"
        message={deleting ? `"${deleting.name}" şöbəsini silmək istədiyinizə əminsiniz?` : ''}
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
