import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  SlideOver,
  ConfirmDialog,
  EmptyState,
  SkeletonRows,
  Avatar,
} from '../../components/ui';

function PartnerPage({ title, singular, description, endpoint, profilePath, icon }) {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  // Axtarış debounce (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const params = search ? { search } : {};
    setLoading(true);
    api
      .get(endpoint, { params })
      .then(({ data }) => setPartners(data))
      .catch(() => notify.error('Siyahı yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [endpoint, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', contactName: '', phone: '', email: '', address: '' });
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    reset({
      name: p.name, contactName: p.contactName ?? '', phone: p.phone ?? '',
      email: p.email ?? '', address: p.address ?? '',
    });
    setError(null);
    setFormOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      contactName: values.contactName || null,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
    };
    try {
      if (editing) await api.put(`${endpoint}/${editing.id}`, payload);
      else await api.post(endpoint, payload);
      setFormOpen(false);
      notify.success(editing ? 'Dəyişikliklər yadda saxlanıldı.' : 'Qeyd yaradıldı.');
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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`${endpoint}/${pendingDelete.id}`);
      notify.success('Qeyd silindi.');
      setPendingDelete(null);
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
        title={title}
        description={description}
        actions={<Button onClick={openCreate}>+ Yeni {singular}</Button>}
      />

      {/* Axtarış */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-80 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            placeholder="Ad üzrə axtar..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Ad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Əlaqədar şəxs</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Telefon</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Email</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">Sifariş sayı</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={6} />
            ) : (
              partners.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`${profilePath}/${p.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5">
                    <span className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <span className="font-medium text-slate-800">{p.name}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{p.contactName || '—'}</td>
                  <td className="px-6 py-3.5 tabular-nums text-slate-700">{p.phone || '—'}</td>
                  <td className="px-6 py-3.5 text-slate-500">{p.email || '—'}</td>
                  <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-slate-800">
                    {p.orderCount}
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setPendingDelete(p)}
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
        {!loading && partners.length === 0 && (
          <EmptyState
            icon={icon}
            title={search ? 'Nəticə tapılmadı' : `Hələ ${singular} yoxdur`}
            description={
              search
                ? 'Axtarış şərtinə uyğun qeyd tapılmadı.'
                : `İlk ${singular} qeydini yaradaraq başlayın.`
            }
            action={!search && <Button onClick={openCreate}>+ Yeni {singular}</Button>}
          />
        )}
      </div>

      {/* Yaratma / redaktə */}
      <SlideOver
        open={formOpen}
        title={editing ? `${editing.name} — redaktə` : `Yeni ${singular}`}
        subtitle={editing ? 'Mövcud qeydin məlumatlarını yenilə' : 'Yeni qeydin əsas məlumatları'}
        onClose={() => setFormOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Ad" required {...register('name', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Əlaqədar şəxs" {...register('contactName')} />
            <Input label="Telefon" {...register('phone')} />
          </div>
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Ünvan" {...register('address')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Qeydi sil"
        message={pendingDelete ? `"${pendingDelete.name}" silinsin? Bu əməliyyat geri qaytarıla bilməz.` : ''}
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export function CustomersPage() {
  return (
    <PartnerPage
      title="Müştərilər"
      singular="müştəri"
      description="Satış sifarişlərinin tərəfdaşları və əlaqə məlumatları"
      endpoint="/customers"
      profilePath="/sales/customers"
      icon="🤝"
    />
  );
}

export function SuppliersPage() {
  return (
    <PartnerPage
      title="Təchizatçılar"
      singular="təchizatçı"
      description="Alış sifarişlərinin tərəfdaşları və əlaqə məlumatları"
      endpoint="/suppliers"
      profilePath="/sales/suppliers"
      icon="🏗️"
    />
  );
}
