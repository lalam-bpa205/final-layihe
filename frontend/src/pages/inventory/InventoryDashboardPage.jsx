import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageHeader, StatCard, EmptyState, Badge } from '../../components/ui';
import {
  Card,
  MovementTypeBadge,
  SignedQty,
  fmtMoney,
  fmtDateTime,
} from './inventoryShared';

// dataviz palitrası (light surface üçün validasiya olunmuş dəst)
const BAR_BLUE = 'from-[#2a78d6] to-[#5b9ce0]';
const BAR_ORANGE = 'from-[#eb6834] to-[#f0905f]';

function BarList({ items, valueKey, maxValue, gradient, formatValue }) {
  return (
    <ul className="space-y-3.5">
      {items.map((it) => (
        <li key={it.name}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-slate-700 truncate">{it.name}</span>
            <span className="ml-3 shrink-0 text-slate-500 tabular-nums">
              {formatValue(it[valueKey])}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
              style={{ width: `${(it[valueKey] / maxValue) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function BarListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3.5 w-2/3 rounded bg-slate-100" />
          <div className="h-2 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="h-3.5 w-40 rounded bg-slate-200" />
          <div className="h-3.5 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function InventoryDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/inventory/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(err.response?.data?.message ?? 'İcmal məlumatları yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  }, []);

  const stockByWarehouse = summary?.stockByWarehouse ?? [];
  const maxWarehouse = Math.max(1, ...stockByWarehouse.map((w) => w.value));
  const categories = summary?.categoryDistribution ?? [];
  const maxCategory = Math.max(1, ...categories.map((c) => c.productCount));
  const lowStock = summary?.lowStockProducts ?? [];
  const recentMovements = summary?.recentMovements ?? [];
  const lowStockCount = summary?.lowStockCount ?? 0;

  return (
    <div>
      <PageHeader
        title="Anbar — İcmal"
        description="Stok vəziyyəti, anbarlar üzrə dəyər və son hərəkətlərin ümumi mənzərəsi"
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Əsas göstəricilər */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon="📦"
          accent="indigo"
          value={summary?.productCount ?? 0}
          label="Məhsul sayı"
          sub={
            <Link to="/inventory/products" className="text-indigo-600 hover:underline">
              Məhsullara bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="💰"
          accent="emerald"
          value={fmtMoney(summary?.totalStockValue)}
          label="Ümumi stok dəyəri"
          sub="Alış qiyməti ilə"
        />
        <StatCard
          loading={loading}
          icon="⚠️"
          accent={lowStockCount > 0 ? 'rose' : 'slate'}
          value={lowStockCount}
          label="Az stoklu məhsul"
          sub={
            lowStockCount > 0 ? (
              <span className="text-red-500 font-medium">Diqqət tələb edir</span>
            ) : (
              'Hər şey qaydasındadır'
            )
          }
        />
        <StatCard
          loading={loading}
          icon="📈"
          accent="sky"
          value={summary?.movementsThisMonth ?? 0}
          label="Bu ay hərəkət"
          sub={
            <Link to="/inventory/stock" className="text-indigo-600 hover:underline">
              Hərəkətlərə bax →
            </Link>
          }
        />
        <StatCard
          loading={loading}
          icon="🏭"
          accent="amber"
          value={summary?.warehouseCount ?? 0}
          label="Anbar sayı"
          sub={`${summary?.categoryCount ?? 0} kateqoriya`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Anbarlar üzrə stok dəyəri */}
        <Card title="Anbarlar üzrə stok dəyəri" icon="🏭">
          {loading ? (
            <BarListSkeleton />
          ) : stockByWarehouse.length === 0 ? (
            <EmptyState
              icon="🏭"
              title="Məlumat yoxdur"
              description="Anbarlarda hələ stok dəyəri qeydə alınmayıb."
            />
          ) : (
            <BarList
              items={stockByWarehouse}
              valueKey="value"
              maxValue={maxWarehouse}
              gradient={BAR_BLUE}
              formatValue={fmtMoney}
            />
          )}
        </Card>

        {/* Kateqoriya paylanması */}
        <Card title="Kateqoriya paylanması" icon="🏷️">
          {loading ? (
            <BarListSkeleton />
          ) : categories.length === 0 ? (
            <EmptyState
              icon="🏷️"
              title="Kateqoriya yoxdur"
              description="Hələ heç bir kateqoriya yaradılmayıb."
            />
          ) : (
            <BarList
              items={categories}
              valueKey="productCount"
              maxValue={maxCategory}
              gradient={BAR_ORANGE}
              formatValue={(v) => `${v} məhsul`}
            />
          )}
        </Card>

        {/* Az stoklu məhsullar */}
        <Card title="Az stoklu məhsullar" icon="⚠️">
          {loading ? (
            <ListSkeleton />
          ) : lowStock.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Az stoklu məhsul yoxdur"
              description="Bütün məhsulların stoku minimum səviyyədən yuxarıdır."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/inventory/products/${p.id}`}
                    className="group flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Minimum: {p.minStockLevel} {p.unit}
                      </p>
                    </div>
                    <Badge tone="red">
                      {p.currentStock} {p.unit}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Son hərəkətlər */}
        <Card
          title="Son hərəkətlər"
          icon="🕘"
          action={
            <Link
              to="/inventory/stock"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Hamısına bax →
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={6} />
          ) : recentMovements.length === 0 ? (
            <EmptyState
              icon="🕘"
              title="Hərəkət yoxdur"
              description="Hələ heç bir stok hərəkəti qeydə alınmayıb."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentMovements.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{m.productName}</p>
                    <p className="text-xs text-slate-400">
                      {m.warehouseName} • {fmtDateTime(m.createdDate)}
                    </p>
                  </div>
                  <SignedQty type={m.type} quantity={m.quantity} />
                  <MovementTypeBadge type={m.type} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
