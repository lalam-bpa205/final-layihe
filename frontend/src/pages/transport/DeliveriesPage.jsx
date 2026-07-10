import { notify } from '../../notify';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const STATUS = {
  1: { text: 'Planlaşdırılıb', cls: 'bg-slate-100 text-slate-700' },
  2: { text: 'Yolda', cls: 'bg-blue-100 text-blue-700' },
  3: { text: 'Çatdırılıb', cls: 'bg-green-100 text-green-700' },
  4: { text: 'Ləğv edilib', cls: 'bg-red-100 text-red-700' },
};

export default function DeliveriesPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    api.get('/deliveries', { params }).then(({ data }) => setResult(data));
  }, [page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRefs = () => {
    api.get('/vehicles').then(({ data }) => setVehicles(data));
    api.get('/drivers').then(({ data }) => setDrivers(data));
  };

  useEffect(loadRefs, []);

  const openCreate = () => {
    reset({
      customerName: '', fromAddress: '', toAddress: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      vehicleId: '', driverId: '', cargoDescription: '', cargoWeightKg: '', note: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      vehicleId: Number(values.vehicleId),
      driverId: Number(values.driverId),
      cargoWeightKg: values.cargoWeightKg ? Number(values.cargoWeightKg) : null,
      cargoDescription: values.cargoDescription || null,
      note: values.note || null,
    };
    try {
      await api.post('/deliveries', payload);
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

  const act = async (d, action) => {
    const confirmText = {
      start: `${d.number} yola salınsın?`,
      complete: `${d.number} çatdırılmış kimi qeyd edilsin?`,
      cancel: `${d.number} ləğv edilsin?`,
    }[action];
    if (!confirm(confirmText)) return;

    try {
      await api.post(`/deliveries/${d.id}/${action}`);
      load();
      loadRefs();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Çatdırılmalar</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni çatdırılma
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Nömrə, müştəri və ya ünvan üzrə axtar..."
          className="rounded-lg border border-slate-300 px-3 py-2 w-80"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS).map(([value, s]) => (
            <option key={value} value={value}>{s.text}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Nömrə</th>
              <th className="text-left px-6 py-3 font-semibold">Müştəri</th>
              <th className="text-left px-6 py-3 font-semibold">Marşrut</th>
              <th className="text-left px-6 py-3 font-semibold">Tarix</th>
              <th className="text-left px-6 py-3 font-semibold">Avtomobil</th>
              <th className="text-left px-6 py-3 font-semibold">Sürücü</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((d) => {
              const st = STATUS[d.status] ?? { text: d.status, cls: 'bg-slate-100' };
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-800">{d.number}</td>
                  <td className="px-6 py-3">{d.customerName}</td>
                  <td className="px-6 py-3 text-slate-500 max-w-56 truncate" title={`${d.fromAddress} → ${d.toAddress}`}>
                    {d.fromAddress} → {d.toAddress}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">{d.scheduledDate}</td>
                  <td className="px-6 py-3 font-mono">{d.vehiclePlate}</td>
                  <td className="px-6 py-3">{d.driverName}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                    {d.status === 1 && (
                      <>
                        <button onClick={() => act(d, 'start')} className="text-blue-600 hover:underline">
                          Yola sal
                        </button>
                        <button onClick={() => act(d, 'cancel')} className="text-red-600 hover:underline">
                          Ləğv et
                        </button>
                      </>
                    )}
                    {d.status === 2 && (
                      <>
                        <button onClick={() => act(d, 'complete')} className="text-green-600 hover:underline">
                          Tamamla
                        </button>
                        <button onClick={() => act(d, 'cancel')} className="text-red-600 hover:underline">
                          Ləğv et
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  Çatdırılma tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} çatdırılma</span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
          >
            ← Əvvəlki
          </button>
          <span>Səhifə {result.page} / {Math.max(result.totalPages, 1)}</span>
          <button
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
          >
            Növbəti →
          </button>
        </div>
      </div>

      <Modal open={modalOpen} title="Yeni çatdırılma" onClose={() => setModalOpen(false)}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelCls}>Müştəri *</label>
            <input className={inputCls} {...register('customerName', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Haradan *</label>
              <input className={inputCls} placeholder="Bakı, ..." {...register('fromAddress', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Haraya *</label>
              <input className={inputCls} placeholder="Gəncə, ..." {...register('toAddress', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Tarix *</label>
              <input type="date" className={inputCls} {...register('scheduledDate', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Avtomobil *</label>
              <select className={inputCls} {...register('vehicleId', { required: true })}>
                <option value="">Seçin...</option>
                {vehicles.filter((v) => v.status === 1).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.capacityKg} kq)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sürücü *</label>
              <select className={inputCls} {...register('driverId', { required: true })}>
                <option value="">Seçin...</option>
                {drivers.filter((d) => d.status === 1).map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Yük təsviri</label>
              <input className={inputCls} {...register('cargoDescription')} />
            </div>
            <div>
              <label className={labelCls}>Yük çəkisi (kq)</label>
              <input type="number" step="0.01" className={inputCls} {...register('cargoWeightKg')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Qeyd</label>
            <input className={inputCls} {...register('note')} />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
