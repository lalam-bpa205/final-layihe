import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { MODULES } from '../../modules';
import { notify } from '../../notify';
import {
  PageHeader,
  Avatar,
  Button,
  Input,
  Select,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
  EmployeeStatusBadge,
} from '../../components/ui';

function ModuleSelector({ selected, onToggle }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-2">
        Hesabın görə biləcəyi modullar
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODULES.filter((m) => !m.adminOnly).map((m) => (
          <label
            key={m.key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
              selected.includes(m.key)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
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
  const navigate = useNavigate();
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [selModules, setSelModules] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modul icazələrini yalnız admin görür və dəyişir
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.roles?.includes('SuperAdmin') || user?.roles?.includes('Admin');

  const { register, handleSubmit, reset, watch, formState } = useForm();
  const selectedDept = watch('departmentId');
  const createAccount = watch('createUserAccount');

  // Axtarış debounce (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (search) params.search = search;
    if (departmentId) params.departmentId = departmentId;
    setLoading(true);
    api
      .get('/employees', { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('İşçilər yüklənə bilmədi.'))
      .finally(() => setLoading(false));
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
      address: '', emergencyContact: '', notes: '',
      createUserAccount: false, userName: '', password: '',
    });
    setSelModules([]);
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = async (e) => {
    setEditing(e);
    reset({
      firstName: e.firstName, lastName: e.lastName, email: e.email,
      phone: e.phone ?? '', birthDate: e.birthDate ?? '', hireDate: e.hireDate,
      salary: e.salary, departmentId: e.departmentId, positionId: e.positionId,
      address: e.address ?? '', emergencyContact: e.emergencyContact ?? '', notes: e.notes ?? '',
      createUserAccount: false, userName: '', password: '',
    });
    setSelModules([]);
    setError(null);
    setPanelOpen(true);

    // Hesabı olan işçinin mövcud modul icazələri yüklənir (yalnız admin)
    if (e.userId && isAdmin) {
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
      address: values.address || null,
      emergencyContact: values.emergencyContact || null,
      notes: values.notes || null,
      userName: values.userName || null,
      password: values.password || null,
      modules: selModules,
    };
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload);
        // Hesabı varsa modul icazələri də yenilənir (yalnız admin)
        if (editing.userId && isAdmin) {
          await api.put(`/employees/${editing.id}/modules`, { modules: selModules });
        }
      } else {
        await api.post('/employees', payload);
      }
      setPanelOpen(false);
      notify.success(editing ? 'İşçi məlumatları yeniləndi.' : 'Yeni işçi əlavə olundu.');
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

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/employees/${deleting.id}`);
      notify.success('İşçi silindi.');
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasFilters = Boolean(search || departmentId);

  return (
    <div>
      <PageHeader
        title="İşçilər"
        description="Şirkət heyətinin siyahısı, axtarış və idarəetmə"
        actions={<Button onClick={openCreate}>+ Yeni işçi</Button>}
      />

      {/* Filtrlər */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-80 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            placeholder="Ad, soyad və ya email üzrə axtar..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          className="w-52"
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
        >
          <option value="">Bütün şöbələr</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşçi</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Əlaqə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Şöbə</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Maaş</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşə qəbul</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={7} withAvatar />
            ) : (
              result.items.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/hr/employees/${e.id}`)}
                  className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${e.firstName} ${e.lastName}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {e.firstName} {e.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{e.positionTitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">
                    <p className="truncate max-w-52">{e.email}</p>
                    {e.phone && <p className="text-xs text-slate-400">{e.phone}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{e.departmentName}</td>
                  <td className="px-6 py-3.5">
                    <EmployeeStatusBadge status={e.status ?? 1} />
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-700 tabular-nums whitespace-nowrap">
                    {Number(e.salary).toLocaleString('az-AZ')} ₼
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">{e.hireDate}</td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(e)}
                      >
                        Sil
                      </Button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && result.items.length === 0 && (
          <EmptyState
            icon="👥"
            title={hasFilters ? 'Nəticə tapılmadı' : 'Hələ işçi yoxdur'}
            description={
              hasFilters
                ? 'Axtarış və ya filtr şərtlərinə uyğun işçi tapılmadı.'
                : 'İlk işçini əlavə edərək komandanı qurmağa başlayın.'
            }
            action={!hasFilters && <Button onClick={openCreate}>+ Yeni işçi</Button>}
          />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} işçi</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Əvvəlki
          </Button>
          <span className="px-1 tabular-nums">
            Səhifə {result.page} / {Math.max(result.totalPages, 1)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= result.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Növbəti →
          </Button>
        </div>
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'İşçini redaktə et' : 'Yeni işçi'}
        subtitle={editing ? `${editing.firstName} ${editing.lastName}` : 'Yeni komanda üzvünün məlumatları'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ad" required {...register('firstName', { required: true })} />
            <Input label="Soyad" required {...register('lastName', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" required type="email" {...register('email', { required: true })} />
            <Input label="Telefon" {...register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Şöbə" required {...register('departmentId', { required: true })}>
              <option value="">Seçin...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
            <Select label="Vəzifə" required {...register('positionId', { required: true })}>
              <option value="">Seçin...</option>
              {filteredPositions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Doğum tarixi" type="date" {...register('birthDate')} />
            <Input label="İşə qəbul" required type="date" {...register('hireDate', { required: true })} />
            <Input label="Maaş (₼)" required type="number" step="0.01" {...register('salary', { required: true })} />
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Əlavə məlumatlar
            </p>
            <Input label="Ünvan" placeholder="Yaşayış ünvanı" {...register('address')} />
            <Input
              label="Təcili əlaqə"
              placeholder="Ad və telefon nömrəsi"
              {...register('emergencyContact')}
            />
            <Textarea label="Qeydlər" placeholder="Daxili qeydlər..." {...register('notes')} />
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
                    <Input label="İstifadəçi adı" required {...register('userName')} />
                    <Input label="Şifrə" required type="password" {...register('password')} />
                  </div>
                  {isAdmin && <ModuleSelector selected={selModules} onToggle={toggleModule} />}
                </>
              )}
            </div>
          )}

          {editing && editing.userId && isAdmin && (
            <div className="border-t border-slate-200 pt-4">
              <ModuleSelector selected={selModules} onToggle={toggleModule} />
            </div>
          )}

          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Yadda saxla
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="İşçini sil"
        message={
          deleting
            ? `${deleting.firstName} ${deleting.lastName} işçisini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
            : ''
        }
        confirmText="Sil"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
