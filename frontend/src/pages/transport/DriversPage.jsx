import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const STATUS = {
  1: { text: 'Hazırdır', cls: 'bg-green-100 text-green-700' },
  2: { text: 'Səfərdə', cls: 'bg-blue-100 text-blue-700' },
  3: { text: 'Deaktiv', cls: 'bg-slate-100 text-slate-600' },
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () => {
    api.get('/drivers').then(({ data }) => setDrivers(data));
    api.get('/drivers/expiring-licenses').then(({ data }) => setExpiring(data));
  };

  useEffect(() => {
    load();
    api.get('/employees', { params: { pageSize: 100 } })
      .then(({ data }) => setEmployees(data.items));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ employeeId: '', licenseNumber: '', licenseCategories: '', licenseExpiryDate: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    reset({
      employeeId: d.employeeId,
      licenseNumber: d.licenseNumber,
      licenseCategories: d.licenseCategories,
      licenseExpiryDate: d.licenseExpiryDate,
    });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = { ...values, employeeId: Number(values.employeeId) };
    try {
      if (editing) await api.put(`/drivers/${editing.id}`, payload);
      else await api.post('/drivers', payload);
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

  const expiringIds = new Set(expiring.map((d) => d.id));

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Sürücülər</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni sürücü
        </button>
      </div>

      {expiring.length > 0 && (
        <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 text-sm">
          ⚠️ <b>{expiring.length}</b> sürücünün vəsiqəsinin müddəti 30 gün ərzində bitir:{' '}
          {expiring.map((d) => `${d.fullName} (${d.licenseExpiryDate})`).join(', ')}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Ad Soyad</th>
              <th className="text-left px-6 py-3 font-semibold">Telefon</th>
              <th className="text-left px-6 py-3 font-semibold">Vəsiqə №</th>
              <th className="text-left px-6 py-3 font-semibold">Kateqoriyalar</th>
              <th className="text-left px-6 py-3 font-semibold">Etibarlıdır</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((d) => {
              const st = STATUS[d.status] ?? { text: d.status, cls: 'bg-slate-100' };
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{d.fullName}</td>
                  <td className="px-6 py-3 text-slate-500">{d.phone || '—'}</td>
                  <td className="px-6 py-3 font-mono">{d.licenseNumber}</td>
                  <td className="px-6 py-3">{d.licenseCategories}</td>
                  <td className="px-6 py-3">
                    <span className={expiringIds.has(d.id) ? 'text-yellow-700 font-semibold' : ''}>
                      {d.licenseExpiryDate} {expiringIds.has(d.id) && '⚠️'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline">
                      Redaktə
                    </button>
                  </td>
                </tr>
              );
            })}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  Hələ sürücü yoxdur. Sürücü əlavə etmək üçün əvvəlcə HR modulunda işçi yaradın.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Sürücünü redaktə et' : 'Yeni sürücü'}
        onClose={() => setModalOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>İşçi *</label>
            <select
              className={inputCls}
              disabled={!!editing}
              {...register('employeeId', { required: true })}
            >
              <option value="">Seçin...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} — {e.positionTitle}
                </option>
              ))}
            </select>
            {editing && (
              <p className="mt-1 text-xs text-slate-400">İşçi bağlantısı dəyişdirilə bilməz.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Vəsiqə nömrəsi *</label>
              <input className={inputCls} placeholder="AB1234567" {...register('licenseNumber', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Kateqoriyalar *</label>
              <input className={inputCls} placeholder="B, C, CE" {...register('licenseCategories', { required: true })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Vəsiqənin bitmə tarixi *</label>
            <input type="date" className={inputCls} {...register('licenseExpiryDate', { required: true })} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
