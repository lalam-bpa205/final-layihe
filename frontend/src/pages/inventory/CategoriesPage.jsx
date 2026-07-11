import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Badge,
  Button,
  Input,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
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
      .get('/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => notify.error('Kateqoriyalar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    reset({ name: c.name, description: c.description ?? '' });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editing) await api.put(`/categories/${editing.id}`, values);
      else await api.post('/categories', values);
      setPanelOpen(false);
      notify.success(editing ? 'Kateqoriya yeniləndi.' : 'Yeni kateqoriya əlavə olundu.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/categories/${deleting.id}`);
      notify.success('Kateqoriya silindi.');
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
        title="Kateqoriyalar"
        description="Məhsulların qruplaşdırılması üçün kateqoriyalar"
        actions={<Button onClick={openCreate}>+ Yeni kateqoriya</Button>}
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Ad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Təsvir</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Məhsul sayı</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={5} cols={4} />
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{c.name}</td>
                  <td className="px-6 py-3.5 text-slate-500 max-w-72 truncate">
                    {c.description || '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone={c.productCount > 0 ? 'indigo' : 'slate'} dot={false}>
                      {c.productCount} məhsul
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(c)}
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
        {!loading && categories.length === 0 && (
          <EmptyState
            icon="🏷️"
            title="Hələ kateqoriya yoxdur"
            description="İlk kateqoriyanı yaradaraq məhsulları qruplaşdırmağa başlayın."
            action={<Button onClick={openCreate}>+ Yeni kateqoriya</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Kateqoriyanı redaktə et' : 'Yeni kateqoriya'}
        subtitle={editing ? editing.name : 'Yeni kateqoriyanın məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Ad" required {...register('name', { required: true })} />
          <Textarea label="Təsvir" placeholder="Kateqoriya barədə qeyd..." {...register('description')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Kateqoriyanı sil"
        message={
          deleting
            ? `"${deleting.name}" kateqoriyasını silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
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
