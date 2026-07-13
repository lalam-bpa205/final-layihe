import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../notify';
import { Button, Badge, ConfirmDialog } from '../../components/ui';
import {
  SalesOrderStatusBadge,
  PurchaseOrderStatusBadge,
  fmtMoney,
  fmtDate,
} from './salesShared';

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-4">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="h-3.5 w-64 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="h-12 rounded bg-slate-100" />
      </div>
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function MetaItem({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

// Satış və alış sifarişi detalı — kind route-dan prop kimi gəlir.
export default function OrderDetailPage({ kind }) {
  const { id } = useParams();
  const isSales = kind === 'sales';

  const endpoint = isSales ? '/sales-orders' : '/purchase-orders';
  const listPath = isSales ? '/sales/sales-orders' : '/sales/purchase-orders';
  const partnerPath = isSales ? '/sales/customers' : '/sales/suppliers';
  const partnerLabel = isSales ? 'Müştəri' : 'Təchizatçı';
  const actionPath = isSales ? 'confirm' : 'receive';
  const actionLabel = isSales ? 'Təsdiqlə' : 'Qəbul et';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'confirm' | 'receive' | 'cancel'
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    api
      .get(`${endpoint}/${id}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [endpoint, id]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setOrder(null);
    load();
  }, [load]);

  const runAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await api.post(`${endpoint}/${id}/${pendingAction}`);
      notify.success(
        pendingAction === 'cancel'
          ? 'Sifariş ləğv edildi.'
          : isSales
            ? 'Sifariş təsdiqləndi.'
            : 'Sifariş qəbul edildi.'
      );
      setPendingAction(null);
      load();
    } catch (err) {
      notify.error(err.response?.data?.message ?? 'Xəta baş verdi.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/60 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">Sifariş tapılmadı</p>
        <p className="mt-1 text-sm text-slate-500">Bu nömrəli sifariş mövcud deyil və ya silinib.</p>
        <Link to={listPath} className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          ← Sifarişlərə qayıt
        </Link>
      </div>
    );
  }

  const items = order.items ?? [];
  const partnerId = isSales ? order.customerId : order.supplierId;
  const partnerName = isSales ? order.customerName : order.supplierName;
  const confirmMessage =
    pendingAction === 'cancel'
      ? `${order.number} ləğv edilsin? Bu əməliyyat geri qaytarıla bilməz.`
      : isSales
        ? `${order.number} təsdiqlənsin? Stok çıxışı və faktura yaradılacaq.`
        : `${order.number} qəbul edilsin? Stok girişi və xərc qeydi yaradılacaq.`;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Naviqasiya + əməliyyatlar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={listPath}
          className="text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          ← {isSales ? 'Satış sifarişləri' : 'Alış sifarişləri'}
        </Link>
        {order.status === 1 && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setPendingAction(actionPath)}>{actionLabel}</Button>
            <Button variant="danger" onClick={() => setPendingAction('cancel')}>
              Ləğv et
            </Button>
          </div>
        )}
      </div>

      {/* Başlıq kartı */}
      <div className="mb-4 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xl font-bold tracking-tight text-slate-900">
              {order.number}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {isSales ? 'Satış sifarişi' : 'Alış sifarişi'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSales && order.invoiceNumber && (
              <Badge tone="indigo" dot={false} className="font-mono">
                🧾 {order.invoiceNumber}
              </Badge>
            )}
            {isSales ? (
              <SalesOrderStatusBadge status={order.status} />
            ) : (
              <PurchaseOrderStatusBadge status={order.status} />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
          <MetaItem label={partnerLabel}>
            {partnerId ? (
              <Link
                to={`${partnerPath}/${partnerId}`}
                className="text-indigo-600 transition-colors hover:text-indigo-700 hover:underline"
              >
                {partnerName}
              </Link>
            ) : (
              partnerName
            )}
          </MetaItem>
          <MetaItem label="Anbar">{order.warehouseName}</MetaItem>
          <MetaItem label="Tarix">
            <span className="tabular-nums">{fmtDate(order.orderDate)}</span>
          </MetaItem>
          <MetaItem label="Ümumi məbləğ">
            <span className="tabular-nums font-semibold">{fmtMoney(order.totalAmount)}</span>
          </MetaItem>
        </div>

        {order.note && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-500">Qeyd: </span>
            {order.note}
          </div>
        )}
      </div>

      {/* Sətirlər */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Sifariş sətirləri
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 pr-4 text-left">Məhsul</th>
                <th className="px-4 py-2.5 text-right">Miqdar</th>
                <th className="px-4 py-2.5 text-right">Qiymət</th>
                <th className="py-2.5 pl-4 text-right">Cəm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-medium text-slate-800">{item.productName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {Number(item.quantity ?? 0).toLocaleString('az-AZ')} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {fmtMoney(item.unitPrice)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums font-medium text-slate-800">
                    {fmtMoney(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Yekun */}
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <dl className="flex items-center gap-6 text-sm">
            <dt className="font-semibold text-slate-900">Ümumi məbləğ</dt>
            <dd className="tabular-nums text-lg font-bold text-slate-900">
              {fmtMoney(order.totalAmount)}
            </dd>
          </dl>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction === 'cancel'
            ? 'Sifarişi ləğv et'
            : isSales
              ? 'Sifarişi təsdiqlə'
              : 'Sifarişi qəbul et'
        }
        message={confirmMessage}
        confirmText={pendingAction === 'cancel' ? 'Ləğv et' : actionLabel}
        loading={actionLoading}
        onConfirm={runAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
