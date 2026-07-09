import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

function PartnerPage({ title, singular, endpoint, orderLabel }) {
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = useCallback(() => {
    const params = search ? { search } : {};
    api.get(endpoint, { params }).then(({ data }) => setPartners(data));
  }, [endpoint, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', contactName: '', phone: '', email: '', address: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    reset({
      name: p.name, contactName: p.contactName ?? '', phone: p.phone ?? '',
      email: p.email ?? '', address: p.address ?? '',
    });
    setError(null);
    setModalOpen(true);
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
      setModalOpen(false);
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

  const onDelete = async (p) => {
    if (!confirm(`"${p.name}" silinsin?`)) return;
    try {
      await api.delete(`${endpoint}/${p.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni {singular}
        </button>
      </div>

      <input
        placeholder="Ad üzrə axtar..."
        className="rounded-lg border border-slate-300 px-3 py-2 w-72 mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Ad</th>
              <th className="text-left px-6 py-3 font-semibold">Əlaqədar şəxs</th>
              <th className="text-left px-6 py-3 font-semibold">Telefon</th>
              <th className="text-left px-6 py-3 font-semibold">Email</th>
              <th className="text-left px-6 py-3 font-semibold">{orderLabel}</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-6 py-3 text-slate-500">{p.contactName || '—'}</td>
                <td className="px-6 py-3">{p.phone || '—'}</td>
                <td className="px-6 py-3 text-slate-500">{p.email || '—'}</td>
                <td className="px-6 py-3">{p.orderCount}</td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline">
                    Redaktə
                  </button>
                  <button onClick={() => onDelete(p)} className="text-red-600 hover:underline">
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  Qeyd tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? `${singular} redaktəsi` : `Yeni ${singular}`}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Ad *</label>
            <input className={inputCls} {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Əlaqədar şəxs</label>
              <input className={inputCls} {...register('contactName')} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input className={inputCls} {...register('phone')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} {...register('email')} />
          </div>
          <div>
            <label className={labelCls}>Ünvan</label>
            <input className={inputCls} {...register('address')} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function CustomersPage() {
  return (
    <PartnerPage
      title="Müştərilər"
      singular="müştəri"
      endpoint="/customers"
      orderLabel="Sifariş sayı"
    />
  );
}

export function SuppliersPage() {
  return (
    <PartnerPage
      title="Təchizatçılar"
      singular="təchizatçı"
      endpoint="/suppliers"
      orderLabel="Sifariş sayı"
    />
  );
}
