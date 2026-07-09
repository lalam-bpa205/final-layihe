import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

export default function VehicleLogsPage() {
  const [tab, setTab] = useState('fuel');
  const [fuel, setFuel] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [modal, setModal] = useState(null); // 'fuel' | 'maintenance'
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = useCallback(() => {
    const params = vehicleFilter ? { vehicleId: vehicleFilter } : {};
    api.get('/fuel-records', { params }).then(({ data }) => setFuel(data));
    api.get('/maintenance-records', { params }).then(({ data }) => setMaintenance(data));
  }, [vehicleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/vehicles').then(({ data }) => setVehicles(data));
    api.get('/drivers').then(({ data }) => setDrivers(data));
  }, []);

  const openModal = (type) => {
    reset({
      vehicleId: vehicleFilter || '', driverId: '', date: new Date().toISOString().slice(0, 10),
      liters: '', cost: '', odometerKm: '', note: '', description: '', nextDueDate: '',
    });
    setError(null);
    setModal(type);
  };

  const onSubmit = async (values) => {
    try {
      if (modal === 'fuel') {
        await api.post('/fuel-records', {
          vehicleId: Number(values.vehicleId),
          driverId: values.driverId ? Number(values.driverId) : null,
          date: values.date,
          liters: Number(values.liters),
          cost: Number(values.cost),
          odometerKm: values.odometerKm ? Number(values.odometerKm) : null,
          note: values.note || null,
        });
      } else {
        await api.post('/maintenance-records', {
          vehicleId: Number(values.vehicleId),
          date: values.date,
          description: values.description,
          cost: Number(values.cost),
          nextDueDate: values.nextDueDate || null,
        });
      }
      setModal(null);
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

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const tabCls = (t) =>
    `px-4 py-2 rounded-lg text-sm font-medium ${
      tab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Yanacaq və Təmir</h2>
        <div className="space-x-2">
          <button onClick={() => openModal('fuel')} className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2">
            + Yanacaq qeydi
          </button>
          <button onClick={() => openModal('maintenance')} className="rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-medium px-4 py-2">
            + Təmir qeydi
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <button className={tabCls('fuel')} onClick={() => setTab('fuel')}>
          ⛽ Yanacaq ({fuel.length})
        </button>
        <button className={tabCls('maintenance')} onClick={() => setTab('maintenance')}>
          🔧 Təmir ({maintenance.length})
        </button>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 ml-auto"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="">Bütün avtomobillər</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.plateNumber}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        {tab === 'fuel' ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Tarix</th>
                <th className="text-left px-6 py-3 font-semibold">Avtomobil</th>
                <th className="text-left px-6 py-3 font-semibold">Sürücü</th>
                <th className="text-right px-6 py-3 font-semibold">Litr</th>
                <th className="text-right px-6 py-3 font-semibold">Məbləğ</th>
                <th className="text-right px-6 py-3 font-semibold">Odometr</th>
                <th className="text-left px-6 py-3 font-semibold">Qeyd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fuel.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap">{f.date}</td>
                  <td className="px-6 py-3 font-mono">{f.vehiclePlate}</td>
                  <td className="px-6 py-3">{f.driverName || '—'}</td>
                  <td className="px-6 py-3 text-right">{f.liters}</td>
                  <td className="px-6 py-3 text-right">{f.cost.toFixed(2)} ₼</td>
                  <td className="px-6 py-3 text-right">{f.odometerKm?.toLocaleString() ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-500">{f.note || '—'}</td>
                </tr>
              ))}
              {fuel.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Yanacaq qeydi yoxdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Tarix</th>
                <th className="text-left px-6 py-3 font-semibold">Avtomobil</th>
                <th className="text-left px-6 py-3 font-semibold">Təsvir</th>
                <th className="text-right px-6 py-3 font-semibold">Məbləğ</th>
                <th className="text-left px-6 py-3 font-semibold">Növbəti baxış</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap">{m.date}</td>
                  <td className="px-6 py-3 font-mono">{m.vehiclePlate}</td>
                  <td className="px-6 py-3">{m.description}</td>
                  <td className="px-6 py-3 text-right">{m.cost.toFixed(2)} ₼</td>
                  <td className="px-6 py-3">{m.nextDueDate ?? '—'}</td>
                </tr>
              ))}
              {maintenance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Təmir qeydi yoxdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!modal}
        title={modal === 'fuel' ? 'Yanacaq qeydi' : 'Təmir qeydi'}
        onClose={() => setModal(null)}
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Avtomobil *</label>
              <select className={inputCls} {...register('vehicleId', { required: true })}>
                <option value="">Seçin...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plateNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tarix *</label>
              <input type="date" className={inputCls} {...register('date', { required: true })} />
            </div>
          </div>

          {modal === 'fuel' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Litr *</label>
                  <input type="number" step="0.01" className={inputCls} {...register('liters', { required: true })} />
                </div>
                <div>
                  <label className={labelCls}>Məbləğ (₼) *</label>
                  <input type="number" step="0.01" className={inputCls} {...register('cost', { required: true })} />
                </div>
                <div>
                  <label className={labelCls}>Odometr (km)</label>
                  <input type="number" className={inputCls} {...register('odometerKm')} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Sürücü</label>
                <select className={inputCls} {...register('driverId')}>
                  <option value="">—</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Qeyd</label>
                <input className={inputCls} {...register('note')} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Təsvir *</label>
                <textarea rows={2} className={inputCls} placeholder="Yağ dəyişimi, əyləc bəndi..." {...register('description', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Məbləğ (₼) *</label>
                  <input type="number" step="0.01" className={inputCls} {...register('cost', { required: true })} />
                </div>
                <div>
                  <label className={labelCls}>Növbəti baxış</label>
                  <input type="date" className={inputCls} {...register('nextDueDate')} />
                </div>
              </div>
            </>
          )}
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
