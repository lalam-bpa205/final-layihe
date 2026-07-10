import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  Select,
  Input,
  Textarea,
  SlideOver,
  EmptyState,
  SkeletonRows,
} from '../../components/ui';

const LEAVE_TYPES = { 1: 'İllik', 2: 'Xəstəlik', 3: 'Ödənişsiz', 4: 'Analıq', 5: 'Digər' };
const STATUS = {
  1: { text: 'Gözləyir', tone: 'yellow' },
  2: { text: 'Təsdiqlənib', tone: 'green' },
  3: { text: 'Rədd edilib', tone: 'red' },
  4: { text: 'Ləğv edilib', tone: 'slate' },
};

const FILTER_CHIPS = [
  { value: '', label: 'Hamısı' },
  { value: '1', label: 'Gözləyir' },
  { value: '2', label: 'Təsdiqlənib' },
  { value: '3', label: 'Rədd edilib' },
];

export default function LeaveRequestsPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState(null);

  // Qərar paneli: { lr, approve }
  const [decideState, setDecideState] = useState(null);
  const [decideNote, setDecideNote] = useState('');
  const [decideLoading, setDecideLoading] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(() => {
    const params = { page, pageSize: 10 };
    if (statusFilter) params.status = statusFilter;
    setLoading(true);
    api
      .get('/leave-requests', { params })
      .then(({ data }) => setResult(data))
      .catch(() => notify.error('Sorğular yüklənə bilmədi.'))
      .finally(() => setLoading(false));
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
    setPanelOpen(true);
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
      setPanelOpen(false);
      notify.success('Məzuniyyət sorğusu göndərildi.');
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

  const openDecide = (lr, approve) => {
    setDecideNote('');
    setDecideState({ lr, approve });
  };

  const submitDecide = async () => {
    if (!decideState) return;
    setDecideLoading(true);
    try {
      await api.post(`/leave-requests/${decideState.lr.id}/decide`, {
        approve: decideState.approve,
        note: decideNote || null,
      });
      notify.success(decideState.approve ? 'Sorğu təsdiqləndi.' : 'Sorğu rədd edildi.');
      setDecideState(null);
      load();
    } catch (err) {
      // Balans xətası daxil olmaqla backend mesajı göstərilir
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setDecideLoading(false);
    }
  };

  const dayCount = (lr) => {
    const s = new Date(lr.startDate);
    const e = new Date(lr.endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    return Math.round((e - s) / 86400000) + 1;
  };

  return (
    <div>
      <PageHeader
        title="Məzuniyyət sorğuları"
        description="İşçilərin məzuniyyət sorğularının qeydiyyatı və təsdiqi"
        actions={<Button onClick={openCreate}>+ Yeni sorğu</Button>}
      />

      {/* Status filter chip-ləri */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_CHIPS.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => { setStatusFilter(chip.value); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-[0.98] ${
                active
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">İşçi</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Növ</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Tarix aralığı</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Səbəb</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows rows={6} cols={6} withAvatar />
            ) : (
              result.items.map((lr) => {
                const st = STATUS[lr.status] ?? { text: lr.status, tone: 'slate' };
                const days = dayCount(lr);
                return (
                  <tr key={lr.id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={lr.employeeName} size="sm" />
                        <span className="font-medium text-slate-800">{lr.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone="indigo" dot={false}>{LEAVE_TYPES[lr.type] ?? lr.type}</Badge>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 tabular-nums">
                      {lr.startDate} → {lr.endDate}
                      {days != null && (
                        <span className="ml-2 text-xs text-slate-400">({days} gün)</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-48 truncate">{lr.reason || '—'}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={st.tone}>{st.text}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {lr.status === 1 && (
                        <span className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => openDecide(lr, true)}
                          >
                            ✓ Təsdiqlə
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => openDecide(lr, false)}
                          >
                            ✕ Rədd et
                          </Button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && result.items.length === 0 && (
          <EmptyState
            icon="🌴"
            title="Sorğu tapılmadı"
            description={
              statusFilter
                ? 'Bu statusda məzuniyyət sorğusu yoxdur.'
                : 'Hələ heç bir məzuniyyət sorğusu yaradılmayıb.'
            }
            action={!statusFilter && <Button onClick={openCreate}>+ Yeni sorğu</Button>}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} sorğu</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Əvvəlki
          </Button>
          <span className="px-1 tabular-nums">Səhifə {result.page} / {Math.max(result.totalPages, 1)}</span>
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

      {/* Yeni sorğu paneli */}
      <SlideOver
        open={panelOpen}
        title="Yeni məzuniyyət sorğusu"
        subtitle="İşçi üçün məzuniyyət sorğusu yaradın"
        onClose={() => setPanelOpen(false)}
      >
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="İşçi" required {...register('employeeId', { required: true })}>
            <option value="">Seçin...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </Select>
          <Select label="Növ" required {...register('type', { required: true })}>
            {Object.entries(LEAVE_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Başlama" required type="date" {...register('startDate', { required: true })} />
            <Input label="Bitmə" required type="date" {...register('endDate', { required: true })} />
          </div>
          <Textarea label="Səbəb" placeholder="Sorğunun səbəbi..." {...register('reason')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Göndər
          </Button>
        </form>
      </SlideOver>

      {/* Təsdiq / rədd paneli — prompt() əvəzinə */}
      <SlideOver
        open={Boolean(decideState)}
        title={decideState?.approve ? 'Sorğunu təsdiqlə' : 'Sorğunu rədd et'}
        subtitle={
          decideState
            ? `${decideState.lr.employeeName} • ${decideState.lr.startDate} → ${decideState.lr.endDate}`
            : ''
        }
        onClose={() => setDecideState(null)}
      >
        {decideState && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 space-y-1">
              <p>
                <span className="font-medium text-slate-800">Növ:</span>{' '}
                {LEAVE_TYPES[decideState.lr.type] ?? decideState.lr.type}
              </p>
              <p>
                <span className="font-medium text-slate-800">Səbəb:</span>{' '}
                {decideState.lr.reason || '—'}
              </p>
            </div>
            <Textarea
              label={decideState.approve ? 'Təsdiq qeydi (opsional)' : 'Rədd səbəbi (opsional)'}
              placeholder="Qeyd yazın..."
              value={decideNote}
              onChange={(e) => setDecideNote(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setDecideState(null)}>
                İmtina
              </Button>
              <Button
                variant={decideState.approve ? 'primary' : 'danger'}
                loading={decideLoading}
                onClick={submitDecide}
              >
                {decideState.approve ? '✓ Təsdiqlə' : '✕ Rədd et'}
              </Button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
