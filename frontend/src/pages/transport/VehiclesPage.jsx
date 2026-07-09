import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const TYPE_LABELS = { 1: 'Yük maşını', 2: 'Furqon', 3: 'Minik', 4: 'Qoşqu' };
const STATUS = {
  1: { text: 'Aktiv', cls: 'bg-green-100 text-green-700' },
  2: { text: 'Səfərdə', cls: 'bg-blue-100 text-blue-700' },
  3: { text: 'Təmirdə', cls: 'bg-yellow-100 text-yellow-700' },
  4: { text: 'Deaktiv', cls: 'bg-slate-100 text-slate-600' },
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () => api.get('/vehicles').then(({ data }) => setVehicles(data));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ plateNumber: '', brand: '', model: '', year: new Date().getFullYear(), type: '1', capacityKg: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    reset({
      plateNumber: v.plateNumber, brand: v.brand, model: v.model,
      year: v.year, type: v.type, capacityKg: v.capacityKg,
    });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      year: Number(values.year),
      type: Number(values.type),
      capacityKg: Number(values.capacityKg),
    };
    try {
      if (editing) await api.put(`/vehicles/${editing.id}`, payload);
      else await api.post('/vehicles', payload);
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

  const setStatus = async (v, status) => {
    try {
      await api.post(`/vehicles/${v.id}/status`, status, {
        headers: { 'Content-Type': 'application/json' },
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Avtomobillər</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni avtomobil
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Nömrə</th>
              <th className="text-left px-6 py-3 font-semibold">Marka / Model</th>
              <th className="text-left px-6 py-3 font-semibold">İl</th>
              <th className="text-left px-6 py-3 font-semibold">Növ</th>
              <th className="text-right px-6 py-3 font-semibold">Tutum (kq)</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((v) => {
              const st = STATUS[v.status] ?? { text: v.status, cls: 'bg-slate-100' };
              return (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{v.plateNumber}</td>
                  <td className="px-6 py-3">{v.brand} {v.model}</td>
                  <td className="px-6 py-3">{v.year}</td>
                  <td className="px-6 py-3">{TYPE_LABELS[v.type] ?? v.type}</td>
                  <td className="px-6 py-3 text-right">{v.capacityKg.toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                    {v.status === 1 && (
                      <button onClick={() => setStatus(v, 3)} className="text-yellow-600 hover:underline">
                        Təmirə göndər
                      </button>
                    )}
                    {v.status === 3 && (
                      <button onClick={() => setStatus(v, 1)} className="text-green-600 hover:underline">
                        Təmirdən qaytar
                      </button>
                    )}
                    <button onClick={() => openEdit(v)} className="text-blue-600 hover:underline">
                      Redaktə
                    </button>
                  </td>
                </tr>
              );
            })}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  Hələ avtomobil yoxdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Avtomobili redaktə et' : 'Yeni avtomobil'}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Dövlət nömrəsi *</label>
              <input className={inputCls} placeholder="10-AB-123" {...register('plateNumber', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Növ *</label>
              <select className={inputCls} {...register('type', { required: true })}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Marka *</label>
              <input className={inputCls} placeholder="Mercedes" {...register('brand', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Model *</label>
              <input className={inputCls} placeholder="Actros" {...register('model', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Buraxılış ili *</label>
              <input type="number" className={inputCls} {...register('year', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Yük tutumu (kq) *</label>
              <input type="number" step="0.01" className={inputCls} {...register('capacityKg', { required: true })} />
            </div>
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
