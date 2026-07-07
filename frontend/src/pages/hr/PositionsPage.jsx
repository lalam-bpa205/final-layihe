import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () =>
    api.get('/positions').then(({ data }) => setPositions(data));

  useEffect(() => {
    load();
    api.get('/departments').then(({ data }) => setDepartments(data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ title: '', description: '', departmentId: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    reset({ title: p.title, description: p.description ?? '', departmentId: p.departmentId });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = { ...values, departmentId: Number(values.departmentId) };
    try {
      if (editing) await api.put(`/positions/${editing.id}`, payload);
      else await api.post('/positions', payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const onDelete = async (p) => {
    if (!confirm(`"${p.title}" vəzifəsini silmək istədiyinizə əminsiniz?`)) return;
    try {
      await api.delete(`/positions/${p.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Vəzifələr</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni vəzifə
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Vəzifə</th>
              <th className="text-left px-6 py-3 font-semibold">Şöbə</th>
              <th className="text-left px-6 py-3 font-semibold">İşçi sayı</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {positions.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{p.title}</td>
                <td className="px-6 py-3 text-slate-500">{p.departmentName}</td>
                <td className="px-6 py-3">{p.employeeCount}</td>
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
            {positions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                  Hələ vəzifə yoxdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Vəzifəni redaktə et' : 'Yeni vəzifə'}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vəzifə adı *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('title', { required: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şöbə *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('departmentId', { required: true })}
            >
              <option value="">Seçin...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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
