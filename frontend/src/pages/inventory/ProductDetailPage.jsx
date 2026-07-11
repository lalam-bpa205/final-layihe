import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { notify } from '../../notify';
import {
  Badge,
  Button,
  Input,
  Select,
  SlideOver,
  EmptyState,
} from '../../components/ui';
import {
  Card,
  MovementTypeBadge,
  SignedQty,
  fmtMoney,
  fmtDateTime,
} from './inventoryShared';

// dataviz palitrası — əsas seriya (light surface üçün validasiya olunmuş)
const LINE_BLUE = '#2a78d6';

const fmtDay = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' });
};

function InfoItem({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = {
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone] ?? 'text-slate-600 bg-slate-50'}`}>
      <p className="text-xl font-bold tracking-tight tabular-nums">{value ?? 0}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-slate-500">{fmtDay(label)}</p>
      <p className="font-semibold text-slate-800 tabular-nums">
        Qalıq: {payload[0].value}
      </p>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [panel, setPanel] = useState(null); // 'in' | 'out'
  const [formError, setFormError] = useState(null);

  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/products/${id}/details`)
      .then(({ data }) => setDetails(data))
      .catch((err) => setError(err.response?.data?.message ?? 'Məhsul məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/warehouses').then(({ data }) => setWarehouses(data));
  }, []);

  const openPanel = (type) => {
    reset({ warehouseId: '', quantity: '', unitPrice: '', note: '' });
    setFormError(null);
    setPanel(type);
  };

  const onSubmit = async (values) => {
    try {
      if (panel === 'in') {
        await api.post('/stock/in', {
          productId: Number(id),
          warehouseId: Number(values.warehouseId),
          quantity: Number(values.quantity),
          unitPrice: values.unitPrice ? Number(values.unitPrice) : null,
          note: values.note || null,
        });
        notify.success('Stok girişi qeydə alındı.');
      } else {
        await api.post('/stock/out', {
          productId: Number(id),
          warehouseId: Number(values.warehouseId),
          quantity: Number(values.quantity),
          note: values.note || null,
        });
        notify.success('Stok çıxışı qeydə alındı.');
      }
      setPanel(null);
      load();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        data?.errors
          ? Object.values(data.errors).flat().join(' ')
          : data?.message ?? 'Xəta baş verdi.'
      );
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-44 rounded-2xl bg-slate-200/70" />
        <div className="h-72 rounded-2xl bg-slate-100" />
        <div className="h-56 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !details?.product) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <EmptyState
          icon="🔍"
          title="Məhsul tapılmadı"
          description={error ?? 'Bu identifikatorla məhsul mövcud deyil.'}
          action={
            <Link to="/inventory/products">
              <Button variant="secondary">← Məhsullar siyahısına qayıt</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const p = details.product;
  const stockByWarehouse = details.stockByWarehouse ?? [];
  const monthly = details.monthlyStats ?? {};
  const history = details.stockHistory ?? [];
  const recentMovements = details.recentMovements ?? [];

  return (
    <div>
      <Link
        to="/inventory/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        ← Məhsullar siyahısı
      </Link>

      {/* Başlıq kartı */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm mb-6">
        <div className="h-2 bg-gradient-to-r from-indigo-600 to-blue-600" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{p.name}</h2>
                {p.isLowStock ? (
                  <Badge tone="red">⚠️ Az stok</Badge>
                ) : (
                  <Badge tone="green">Stok normaldır</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-mono text-slate-600">{p.barcode}</span>
                {' • '}
                {p.categoryName}
                {p.description ? ` • ${p.description}` : ''}
              </p>
            </div>

            {/* Sürətli əməliyyatlar */}
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => openPanel('in')}>+ Giriş</Button>
              <Button
                variant="secondary"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => openPanel('out')}
              >
                − Çıxış
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-slate-100 pt-5">
            <InfoItem label="Alış qiyməti" value={fmtMoney(p.purchasePrice)} />
            <InfoItem label="Satış qiyməti" value={fmtMoney(p.salePrice)} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Cari stok
              </p>
              <p className="mt-1">
                <Badge tone={p.isLowStock ? 'red' : 'green'}>
                  {p.currentStock} {p.unit}
                </Badge>
              </p>
            </div>
            <InfoItem label="Minimum stok" value={`${p.minStockLevel} ${p.unit}`} />
            <InfoItem label="Ölçü vahidi" value={p.unit} />
          </div>
        </div>
      </div>

      {/* Stok tarixi */}
      <Card title="Stok tarixi (son 30 gün)" icon="📈" className="mb-4">
        {history.length === 0 ? (
          <EmptyState
            icon="📈"
            title="Tarixçə yoxdur"
            description="Bu məhsul üçün hələ stok hərəkəti qeydə alınmayıb."
          />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="stockBalanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_BLUE} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={LINE_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDay}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                minTickGap={28}
              />
              <YAxis
                dataKey="balance"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                name="Qalıq"
                stroke={LINE_BLUE}
                strokeWidth={2}
                fill="url(#stockBalanceFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Anbarlar üzrə qalıq + Bu ay */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <Card title="Anbarlar üzrə qalıq" icon="🏭">
          {stockByWarehouse.length === 0 ? (
            <EmptyState
              icon="🏭"
              title="Qalıq yoxdur"
              description="Bu məhsul hazırda heç bir anbarda mövcud deyil."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stockByWarehouse.map((w) => (
                <li
                  key={w.warehouseId}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-slate-700">{w.warehouseName}</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {w.quantity} {p.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Bu ay" icon="📅">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Giriş" value={monthly.inQty} tone="green" />
            <MiniStat label="Çıxış" value={monthly.outQty} tone="red" />
            <MiniStat label="Hərəkət sayı" value={monthly.movementCount} tone="blue" />
          </div>
        </Card>
      </div>

      {/* Son hərəkətlər */}
      <Card title="Son hərəkətlər" icon="🕘">
        {recentMovements.length === 0 ? (
          <EmptyState
            icon="🕘"
            title="Hərəkət yoxdur"
            description="Bu məhsul üzrə hələ stok hərəkəti qeydə alınmayıb."
          />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Tarix
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Anbar
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Növ
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Miqdar
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Qeyd
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                      {fmtDateTime(m.createdDate)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{m.warehouseName}</td>
                    <td className="px-5 py-3">
                      <MovementTypeBadge type={m.type} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <SignedQty type={m.type} quantity={m.quantity} unit={p.unit} />
                    </td>
                    <td className="px-5 py-3 text-slate-500 max-w-48 truncate">{m.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Giriş / Çıxış paneli */}
      <SlideOver
        open={Boolean(panel)}
        title={panel === 'in' ? 'Stok girişi' : 'Stok çıxışı'}
        subtitle={p.name}
        onClose={() => setPanel(null)}
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Anbar" required {...register('warehouseId', { required: true })}>
            <option value="">Seçin...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Miqdar (${p.unit})`}
              required
              type="number"
              step="0.001"
              min="0"
              {...register('quantity', { required: true })}
            />
            {panel === 'in' && (
              <Input
                label="Vahid qiymət (₼)"
                type="number"
                step="0.01"
                min="0"
                {...register('unitPrice')}
              />
            )}
          </div>
          <Input label="Qeyd" placeholder="Əməliyyat barədə qeyd..." {...register('note')} />
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            {panel === 'in' ? 'Girişi təsdiqlə' : 'Çıxışı təsdiqlə'}
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
