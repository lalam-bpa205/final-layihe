import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Badge,
  Input,
  Select,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';

export default function FinanceCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = () => {
    setLoading(true);
    api
      .get('/finance/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => notify.error('Kateqoriyalar yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    reset({ name: '', type: '2' });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/finance/categories', {
        name: values.name,
        type: Number(values.type),
      });
      setPanelOpen(false);
      notify.success('Kateqoriya yaradıldı.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/finance/categories/${pendingDelete.id}`);
      notify.success('Kateqoriya silindi.');
      setPendingDelete(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const incomeCategories = categories.filter((c) => c.type === 1);
  const expenseCategories = categories.filter((c) => c.type === 2);

  const CategoryTable = ({ title, icon, items, tone, emptyText }) => (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span aria-hidden="true">{icon}</span>
        <h3 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows rows={4} cols={3} />
          ) : (
            items.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-indigo-50/40">
                <td className="px-6 py-3.5 font-medium text-slate-800">{c.name}</td>
                <td className="px-6 py-3.5">
                  <Badge tone={tone} dot={false}>
                    {c.transactionCount} əməliyyat
                  </Badge>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPendingDelete(c)}
                  >
                    Sil
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && items.length === 0 && (
        <EmptyState icon={icon} title="Kateqoriya yoxdur" description={emptyText} />
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Maliyyə kateqoriyaları"
        description="Gəlir və xərc əməliyyatlarının qruplaşdırılması"
        actions={<Button onClick={openCreate}>+ Yeni kateqoriya</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryTable
          title="Gəlir kateqoriyaları"
          icon="💰"
          items={incomeCategories}
          tone="green"
          emptyText="Hələ gəlir kateqoriyası əlavə olunmayıb."
        />
        <CategoryTable
          title="Xərc kateqoriyaları"
          icon="💸"
          items={expenseCategories}
          tone="red"
          emptyText="Hələ xərc kateqoriyası əlavə olunmayıb."
        />
      </div>

      <SlideOver
        open={panelOpen}
        title="Yeni kateqoriya"
        subtitle="Gəlir və ya xərc kateqoriyasının məlumatları"
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Ad"
            required
            placeholder="Yanacaq, Maaşlar, Satış..."
            {...register('name', { required: true })}
          />
          <Select label="Tip" required {...register('type', { required: true })}>
            <option value="1">Gəlir</option>
            <option value="2">Xərc</option>
          </Select>
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Kateqoriyanı sil"
        message={pendingDelete ? `"${pendingDelete.name}" kateqoriyası silinsin?` : ''}
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
