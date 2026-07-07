import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { MODULES } from '../../modules';

function ModuleSelector({ selected, onToggle }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-2">
        Hesabın görə biləcəyi modullar
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map((m) => (
          <label
            key={m.key}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
              selected.includes(m.key)
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.key)}
              onChange={() => onToggle(m.key)}
            />
            <span>{m.icon}</span>
            <span>{m.label}</span>
            {!m.ready && <span className="text-[10px] text-slate-400">(tezliklə)</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [selModules, setSelModules] = useState([]);

  const { register, handleSubmit, reset, watch } = useForm();
  const selectedDept = watch('departmentId');
  const createAccount = watch('createUserAccount');

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (search) params.search = search;
    if (departmentId) params.departmentId = departmentId;
    api.get('/employees', { params }).then(({ data }) => setResult(data));
  }, [page, search, departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data));
    api.get('/positions').then(({ data }) => setPositions(data));
  }, []);

  const filteredPositions = positions.filter(
    (p) => !selectedDept || p.departmentId === Number(selectedDept)
  );

  const openCreate = () => {
    setEditing(null);
    reset({
      firstName: '', lastName: '', email: '', phone: '',
      birthDate: '', hireDate: new Date().toISOString().slice(0, 10),
      salary: '', departmentId: '', positionId: '',
      createUserAccount: false, userName: '', password: '',
    });
    setSelModules([]);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = async (e) => {
    setEditing(e);
    reset({
      firstName: e.firstName, lastName: e.lastName, email: e.email,
      phone: e.phone ?? '', birthDate: e.birthDate ?? '', hireDate: e.hireDate,
      salary: e.salary, departmentId: e.departmentId, positionId: e.positionId,
      createUserAccount: false, userName: '', password: '',
    });
    setSelModules([]);
    setError(null);
    setModalOpen(true);

    // Hesabı olan işçinin mövcud modul icazələri yüklənir
    if (e.userId) {
      const { data } = await api.get(`/employees/${e.id}/modules`);
      setSelModules(data);
    }
  };

  const toggleModule = (key) =>
    setSelModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      salary: Number(values.salary),
      departmentId: Number(values.departmentId),
      positionId: Number(values.positionId),
      birthDate: values.birthDate || null,
      phone: values.phone || null,
      userName: values.userName || null,
      password: values.password || null,
      modules: selModules,
    };
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload);
        // Hesabı varsa modul icazələri də yenilənir
        if (editing.userId) {
          await api.put(`/employees/${editing.id}/modules`, { modules: selModules });
        }
      } else {
        await api.post('/employees', payload);
      }
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

  const onDelete = async (e) => {
    if (!confirm(`${e.firstName} ${e.lastName} işçisini silmək istədiyinizə əminsiniz?`)) return;
    await api.delete(`/employees/${e.id}`);
    load();
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">İşçilər</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
        >
          + Yeni işçi
        </button>
      </div>

      {/* Filtrlər */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Ad, soyad və ya email üzrə axtar..."
          className="rounded-lg border border-slate-300 px-3 py-2 w-72"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
        >
          <option value="">Bütün şöbələr</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Ad Soyad</th>
              <th className="text-left px-6 py-3 font-semibold">Email</th>
              <th className="text-left px-6 py-3 font-semibold">Şöbə</th>
              <th className="text-left px-6 py-3 font-semibold">Vəzifə</th>
              <th className="text-left px-6 py-3 font-semibold">Maaş</th>
              <th className="text-left px-6 py-3 font-semibold">İşə qəbul</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">
                  {e.firstName} {e.lastName}
                </td>
                <td className="px-6 py-3 text-slate-500">{e.email}</td>
                <td className="px-6 py-3">{e.departmentName}</td>
                <td className="px-6 py-3">{e.positionTitle}</td>
                <td className="px-6 py-3">{e.salary.toLocaleString()} ₼</td>
                <td className="px-6 py-3">{e.hireDate}</td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(e)} className="text-blue-600 hover:underline">
                    Redaktə
                  </button>
                  <button onClick={() => onDelete(e)} className="text-red-600 hover:underline">
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  İşçi tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} işçi</span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
          >
            ← Əvvəlki
          </button>
          <span>
            Səhifə {result.page} / {Math.max(result.totalPages, 1)}
          </span>
          <button
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 bg-white"
          >
            Növbəti →
          </button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'İşçini redaktə et' : 'Yeni işçi'}
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
              <label className={labelCls}>Ad *</label>
              <input className={inputCls} {...register('firstName', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Soyad *</label>
              <input className={inputCls} {...register('lastName', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" className={inputCls} {...register('email', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input className={inputCls} {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Şöbə *</label>
              <select className={inputCls} {...register('departmentId', { required: true })}>
                <option value="">Seçin...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vəzifə *</label>
              <select className={inputCls} {...register('positionId', { required: true })}>
                <option value="">Seçin...</option>
                {filteredPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Doğum tarixi</label>
              <input type="date" className={inputCls} {...register('birthDate')} />
            </div>
            <div>
              <label className={labelCls}>İşə qəbul *</label>
              <input type="date" className={inputCls} {...register('hireDate', { required: true })} />
            </div>
            <div>
              <label className={labelCls}>Maaş (₼) *</label>
              <input type="number" step="0.01" className={inputCls} {...register('salary', { required: true })} />
            </div>
          </div>

          {!editing && (
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" {...register('createUserAccount')} />
                Sistemə giriş hesabı yarat
              </label>
              {createAccount && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>İstifadəçi adı *</label>
                      <input className={inputCls} {...register('userName')} />
                    </div>
                    <div>
                      <label className={labelCls}>Şifrə *</label>
                      <input type="password" className={inputCls} {...register('password')} />
                    </div>
                  </div>
                  <ModuleSelector selected={selModules} onToggle={toggleModule} />
                </>
              )}
            </div>
          )}

          {editing && editing.userId && (
            <div className="border-t border-slate-200 pt-4">
              <ModuleSelector selected={selModules} onToggle={toggleModule} />
            </div>
          )}

          <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2">
            Yadda saxla
          </button>
        </form>
      </Modal>
    </div>
  );
}
