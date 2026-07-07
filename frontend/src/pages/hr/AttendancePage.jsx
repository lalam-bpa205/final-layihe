import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_LABELS = {
  1: { text: 'İşdə', cls: 'bg-green-100 text-green-700' },
  2: { text: 'Gecikib', cls: 'bg-yellow-100 text-yellow-700' },
  3: { text: 'Yoxdur', cls: 'bg-red-100 text-red-700' },
  4: { text: 'Məzuniyyət', cls: 'bg-blue-100 text-blue-700' },
};

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    api.get('/attendance', { params: { date } }).then(({ data }) => setRecords(data));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/employees', { params: { pageSize: 100 } })
      .then(({ data }) => setEmployees(data.items));
  }, []);

  const act = async (path) => {
    if (!selectedEmployee) return;
    setMessage(null);
    try {
      await api.post(`/attendance/${path}`, { employeeId: Number(selectedEmployee) });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Davamiyyət</h2>
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {date === today && (
        <div className="bg-white rounded-2xl shadow p-4 mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-slate-700 mb-1">İşçi</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Seçin...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => act('check-in')}
            className="rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2"
          >
            Check-in
          </button>
          <button
            onClick={() => act('check-out')}
            className="rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-medium px-4 py-2"
          >
            Check-out
          </button>
          {message && <p className="text-sm text-red-600 w-full">{message}</p>}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">İşçi</th>
              <th className="text-left px-6 py-3 font-semibold">Gəliş</th>
              <th className="text-left px-6 py-3 font-semibold">Gediş</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="text-left px-6 py-3 font-semibold">Qeyd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => {
              const status = STATUS_LABELS[r.status] ?? { text: r.status, cls: 'bg-slate-100' };
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{r.employeeName}</td>
                  <td className="px-6 py-3">{r.checkIn?.slice(0, 5) ?? '—'}</td>
                  <td className="px-6 py-3">{r.checkOut?.slice(0, 5) ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{r.note || '—'}</td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  Bu tarix üçün qeyd yoxdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
