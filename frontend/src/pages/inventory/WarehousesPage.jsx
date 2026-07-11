import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
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
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', location: '' });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    reset({ name: w.name, location: w.location ?? '' });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editing) await api.put(`/warehouses/${editing.id}`, values);
      else await api.post('/warehouses', values);
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
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={4} cols={3} />
            ) : (
              warehouses.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    <span className="mr-2" aria-hidden="true">🏭</span>
                    {w.name}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{w.location || '—'}</td>
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
