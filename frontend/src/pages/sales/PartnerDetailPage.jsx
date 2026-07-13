import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { StatCard, Avatar, EmptyState, SkeletonRows } from '../../components/ui';
import {
  Card,
  SalesOrderStatusBadge,
  PurchaseOrderStatusBadge,
  fmtMoney,
  fmtDate,
} from './salesShared';

function HeaderSkeleton() {
  return (
    <div className="mb-6 animate-pulse rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="h-3.5 w-80 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function ContactItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span aria-hidden="true">{icon}</span>
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-700">{value || '—'}</span>
    </div>
  );
}

// Müştəri və təchizatçı profili — kind path-dən və ya prop-dan gəlir.
export default function PartnerDetailPage({ kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCustomer = kind === 'customer';

  const listPath = isCustomer ? '/sales/customers' : '/sales/suppliers';
  const orderPath = isCustomer ? '/sales/sales-orders' : '/sales/purchase-orders';
  const detailsEndpoint = isCustomer ? `/customers/${id}/details` : `/suppliers/${id}/details`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setData(null);
    api
      .get(detailsEndpoint)
      .then(({ data }) => setData(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [detailsEndpoint]);

  const partner = isCustomer ? data?.customer : data?.supplier;
  const stats = data?.stats ?? {};
  const orders = data?.recentOrders ?? [];
  const outstanding = Number(stats.outstandingAmount ?? 0);

  if (!loading && (notFound || !partner)) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/60 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">
          {isCustomer ? 'Müştəri tapılmadı' : 'Təchizatçı tapılmadı'}
        </p>
        <p className="mt-1 text-sm text-slate-500">Bu qeyd mövcud deyil və ya silinib.</p>
        <Link to={listPath} className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          ← {isCustomer ? 'Müştərilərə qayıt' : 'Təchizatçılara qayıt'}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          to={listPath}
          className="text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← {isCustomer ? 'Müştərilər' : 'Təchizatçılar'}
        </Link>
      </div>

      {/* Başlıq kartı */}
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={partner.name} size="xl" />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{partner.name}</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {isCustomer ? 'Müştəri profili' : 'Təchizatçı profili'}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
                <ContactItem icon="👤" label="Əlaqədar şəxs" value={partner.contactName} />
                <ContactItem icon="📞" label="Telefon" value={partner.phone} />
                <ContactItem icon="✉️" label="Email" value={partner.email} />
                <ContactItem icon="📍" label="Ünvan" value={partner.address} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistikalar */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 ${
          isCustomer ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
        }`}
      >
        <StatCard
          loading={loading}
          icon="🧾"
          accent="indigo"
          value={stats.orderCount ?? 0}
          label="Sifariş sayı"
        />
        <StatCard
          loading={loading}
          icon="✅"
          accent="emerald"
          value={isCustomer ? stats.confirmedCount ?? 0 : stats.receivedCount ?? 0}
          label={isCustomer ? 'Təsdiqlənmiş sifariş' : 'Qəbul edilmiş sifariş'}
        />
        <StatCard
          loading={loading}
          icon="💰"
          accent="sky"
          value={fmtMoney(stats.totalAmount)}
          label="Ümumi məbləğ"
        />
        {isCustomer && (
          <StatCard
            loading={loading}
            icon="⚠️"
            accent={outstanding > 0 ? 'rose' : 'slate'}
            value={fmtMoney(stats.outstandingAmount)}
            label="Ödənilməmiş borc"
            sub={
              outstanding > 0 ? (
                <span className="font-medium text-red-600">Faktura qalığı mövcuddur</span>
              ) : (
                'Bütün fakturalar bağlanıb'
              )
            }
          />
        )}
      </div>

      {/* Son sifarişlər */}
      <Card title="Son sifarişlər" icon="🕘">
        {!loading && orders.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Sifariş yoxdur"
            description={
              isCustomer
                ? 'Bu müştəri üzrə hələ satış sifarişi yaradılmayıb.'
                : 'Bu təchizatçı üzrə hələ alış sifarişi yaradılmayıb.'
            }
          />
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Nömrə</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Tarix</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Anbar</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider">Məbləğ</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows rows={5} cols={5} />
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`${orderPath}/${o.id}`)}
                      className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">{o.number}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap tabular-nums text-slate-500">
                        {fmtDate(o.orderDate)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{o.warehouseName}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-slate-800">
                        {fmtMoney(o.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        {isCustomer ? (
                          <SalesOrderStatusBadge status={o.status} />
                        ) : (
                          <PurchaseOrderStatusBadge status={o.status} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
