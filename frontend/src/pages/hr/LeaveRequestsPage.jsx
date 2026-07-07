import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const LEAVE_TYPES = { 1: 'İllik', 2: 'Xəstəlik', 3: 'Ödənişsiz', 4: 'Analıq', 5: 'Digər' };
const STATUS = {
  1: { text: 'Gözləyir', cls: 'bg-yellow-100 text-yellow-700' },
  2: { text: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700' },
  3: { text: 'Rədd edilib', cls: 'bg-red-100 text-red-700' },
  4: { text: 'Ləğv edilib', cls: 'bg-slate-100 text-slate-600' },
};

export default function LeaveRequestsPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (statusFilter) params.status = statusFilter;
    api.get('/leave-requests', { params }).then(({ data }) => setResult(data));
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/employees', { params: { pageSize: 100 } })
      .then(({ data }) => setEmployees(data.items));
  }, []);

  const openCreate = () => {
    reset({ employeeId: '', type: '1', startDate: '', endDate: '', reason: '' });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      await api.post('/leave-requests', {
        employeeId: Number(values.employeeId),
        type: Number(values.type),
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || null,
      });
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

  const decide = async (lr, approve) => {
    const note = prompt(approve ? 'Təsdiq qeydi (opsional):' : 'Rədd səbəbi (opsional):') ?? undefined;
    try {
      await api.post(`/leave-requests/${lr.id}/decide`, { approve, note: note || null });
      load();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Məzuniyyət sorğuları</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni sorğu
        </button>
      </div>

      <div className="mb-4">
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Bütün statuslar</option>
          <option value="1">Gözləyir</option>
          <option value="2">Təsdiqlənib</option>
          <option value="3">Rədd edilib</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">İşçi</th>
              <th className="text-left px-6 py-3 font-semibold">Növ</th>
              <th className="text-left px-6 py-3 font-semibold">Tarix aralığı</th>
              <th className="text-left px-6 py-3 font-semibold">Səbəb</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((lr) => {
              const st = STATUS[lr.status] ?? { text: lr.status, cls: 'bg-slate-100' };
              return (
                <tr key={lr.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{lr.employeeName}</td>
                  <td className="px-6 py-3">{LEAVE_TYPES[lr.type] ?? lr.type}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {lr.startDate} → {lr.endDate}
                  </td>
                  <td className="px-6 py-3 text-slate-500 max-w-48 truncate">{lr.reason || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                    {lr.status === 1 && (
                      <>
                        <button
                          onClick={() => decide(lr, true)}
                          className="text-green-600 hover:underline"
                        >
                          Təsdiqlə
                        </button>
                        <button
                          onClick={() => decide(lr, false)}
                          className="text-red-600 hover:underline"
                        >
                          Rədd et
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  Sorğu tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} sorğu</span>
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

      <Modal open={modalOpen} title="Yeni məzuniyyət sorğusu" onClose={() => setModalOpen(false)}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İşçi *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('employeeId', { required: true })}
            >
              <option value="">Seçin...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Növ *</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('type', { required: true })}
            >
              {Object.entries(LEAVE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Başlama *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register('startDate', { required: true })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bitmə *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                {...register('endDate', { required: true })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Səbəb</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('reason')}
            />
          </div>
          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Göndər
          </button>
        </form>
      </Modal>
    </div>
  );
}
