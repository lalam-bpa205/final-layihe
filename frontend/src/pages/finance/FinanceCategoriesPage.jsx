import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

export default function FinanceCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () => api.get('/finance/categories').then(({ data }) => setCategories(data));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    reset({ name: '', type: '2' });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/finance/categories', {
        name: values.name,
        type: Number(values.type),
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const onDelete = async (c) => {
    if (!confirm(`"${c.name}" kateqoriyasını silmək istədiyinizə əminsiniz?`)) return;
    try {
      await api.delete(`/finance/categories/${c.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    }
  };

  const incomeCategories = categories.filter((c) => c.type === 1);
  const expenseCategories = categories.filter((c) => c.type === 2);

  const CategoryTable = ({ title, items, badgeCls }) => (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-6 py-3 font-medium text-slate-800">{c.name}</td>
              <td className="px-6 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeCls}`}>
                  {c.transactionCount} əməliyyat
                </span>
              </td>
              <td className="px-6 py-3 text-right">
                <button onClick={() => onDelete(c)} className="text-red-600 hover:underline">
                  Sil
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="px-6 py-6 text-center text-slate-400">Kateqoriya yoxdur.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Maliyyə kateqoriyaları</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni kateqoriya
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryTable
          title="💰 Gəlir kateqoriyaları"
          items={incomeCategories}
          badgeCls="bg-green-100 text-green-700"
        />
        <CategoryTable
          title="💸 Xərc kateqoriyaları"
          items={expenseCategories}
          badgeCls="bg-red-100 text-red-700"
        />
      </div>

      <Modal open={modalOpen} title="Yeni kateqoriya" onClose={() => setModalOpen(false)}>
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
              placeholder="Yanacaq, Maaşlar, Satış..."
              {...register('name', { required: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tip *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('type', { required: true })}
            >
              <option value="1">Gəlir</option>
              <option value="2">Xərc</option>
            </select>
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
