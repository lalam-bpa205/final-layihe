import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () => api.get('/categories').then(({ data }) => setCategories(data));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    reset({ name: c.name, description: c.description ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editing) await api.put(`/categories/${editing.id}`, values);
      else await api.post('/categories', values);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const onDelete = async (c) => {
    if (!confirm(`"${c.name}" kateqoriyasını silmək istədiyinizə əminsiniz?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kateqoriyalar</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni kateqoriya
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Ad</th>
              <th className="text-left px-6 py-3 font-semibold">Təsvir</th>
              <th className="text-left px-6 py-3 font-semibold">Məhsul sayı</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-6 py-3 text-slate-500">{c.description || '—'}</td>
                <td className="px-6 py-3">{c.productCount}</td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline">
                    Redaktə
                  </button>
                  <button onClick={() => onDelete(c)} className="text-red-600 hover:underline">
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                  Hələ kateqoriya yoxdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Kateqoriyanı redaktə et' : 'Yeni kateqoriya'}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ad *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('name', { required: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Təsvir</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('description')}
            />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
