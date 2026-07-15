import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Button,
  Input,
  SlideOver,
  EmptyState,
  SkeletonRows,
  ConfirmDialog,
} from '../../components/ui';

// Həftə günləri — form sahə adları backend DTO ilə üst-üstə düşür
const DAYS = [
  { key: 'monday', short: 'B.e', long: 'Bazar ertəsi' },
  { key: 'tuesday', short: 'Ç.a', long: 'Çərşənbə axşamı' },
  { key: 'wednesday', short: 'Ç', long: 'Çərşənbə' },
  { key: 'thursday', short: 'C.a', long: 'Cümə axşamı' },
  { key: 'friday', short: 'C', long: 'Cümə' },
  { key: 'saturday', short: 'Ş', long: 'Şənbə' },
  { key: 'sunday', short: 'B', long: 'Bazar' },
];

// Qrafikin qısa günlər zolağı (cədvəldə göstərmək üçün)
function DayStrip({ schedule }) {
  return (
    <span className="inline-flex gap-1">
      {DAYS.map((d) => (
        <span
          key={d.key}
          title={d.long}
          className={`flex h-6 w-7 items-center justify-center rounded text-[11px] font-medium ${
            schedule[d.key]
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-300'
          }`}
        >
          {d.short}
        </span>
      ))}
    </span>
  );
}

export default function WorkSchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const watched = watch();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/work-schedules')
      .then(({ data }) => setSchedules(data))
      .catch(() => notify.error('İş qrafikləri yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({
      name: '', startTime: '09:00', endTime: '18:00',
      monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
      saturday: false, sunday: false,
    });
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    reset({
      name: s.name,
      startTime: s.startTime.slice(0, 5),
      endTime: s.endTime.slice(0, 5),
      monday: s.monday, tuesday: s.tuesday, wednesday: s.wednesday,
      thursday: s.thursday, friday: s.friday, saturday: s.saturday, sunday: s.sunday,
    });
    setError(null);
    setPanelOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      startTime: values.startTime.length === 5 ? `${values.startTime}:00` : values.startTime,
      endTime: values.endTime.length === 5 ? `${values.endTime}:00` : values.endTime,
      monday: !!values.monday, tuesday: !!values.tuesday, wednesday: !!values.wednesday,
      thursday: !!values.thursday, friday: !!values.friday,
      saturday: !!values.saturday, sunday: !!values.sunday,
    };
    try {
      if (editing) await api.put(`/work-schedules/${editing.id}`, payload);
      else await api.post('/work-schedules', payload);
      setPanelOpen(false);
      notify.success(editing ? 'Qrafik yeniləndi.' : 'Yeni qrafik yaradıldı.');
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Xəta baş verdi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/work-schedules/${deleting.id}`);
      notify.success('Qrafik silindi.');
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Silmək mümkün olmadı.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="İş qrafikləri"
        description="İşçilərin iş günlərini və saatlarını müəyyən edən qrafiklər"
        actions={<Button onClick={openCreate}>+ Yeni qrafik</Button>}
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Ad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İş günləri</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Saatlar</th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşçilər</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={3} cols={5} />
            ) : (
              schedules.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    {s.name}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {s.workDayCount} gün
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <DayStrip schedule={s} />
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-slate-600">
                    {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-slate-800">
                    {s.employeeCount}
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      Redaktə
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setDeleting(s)}
                    >
                      Sil
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && schedules.length === 0 && (
          <EmptyState
            icon="🗓️"
            title="Hələ iş qrafiki yoxdur"
            description="İlk iş qrafikini yaradaraq işçilərə fərqli qrafiklər təyin edə bilərsiniz."
            action={<Button onClick={openCreate}>+ Yeni qrafik</Button>}
          />
        )}
      </div>

      <SlideOver
        open={panelOpen}
        title={editing ? 'Qrafiki redaktə et' : 'Yeni iş qrafiki'}
        subtitle={editing ? editing.name : 'İş günlərini və saatlarını seçin'}
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Qrafik adı" required placeholder="Məs. Standart (B.e–Cümə)" {...register('name', { required: true })} />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">İş günləri *</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = watched[d.key];
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setValue(d.key, !active, { shouldDirty: true })}
                    className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                    title={d.long}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Seçilmiş günlər iş günü sayılır.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="İş başlama saatı" required type="time" {...register('startTime', { required: true })} />
            <Input label="İş bitmə saatı" required type="time" {...register('endTime', { required: true })} />
          </div>

          <Button type="submit" className="w-full">Yadda saxla</Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={!!deleting}
        title="Qrafiki sil"
        message={`"${deleting?.name}" qrafikini silmək istədiyinizə əminsiniz?`}
        confirmText="Sil"
        danger
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
