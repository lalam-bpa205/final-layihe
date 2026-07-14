import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { ACTION_LABELS as ACTIONS, entityLabel } from './managementShared';

// Sahə adlarının qarşılığı
const FIELD_LABELS = {
  Name: 'Ad', Title: 'Başlıq', FirstName: 'Ad', LastName: 'Soyad', Email: 'Email', Phone: 'Telefon',
  Salary: 'Maaş', Status: 'Status', Quantity: 'Miqdar', Amount: 'Məbləğ', UnitPrice: 'Vahid qiymət',
  SalePrice: 'Satış qiyməti', PurchasePrice: 'Alış qiyməti', MinStockLevel: 'Minimum stok',
  IsDeleted: 'Silinib', IsActive: 'Aktiv', Description: 'Təsvir', Note: 'Qeyd', Barcode: 'Barkod',
  CustomerName: 'Müştəri', TotalAmount: 'Ümumi məbləğ', LimitAmount: 'Limit', Date: 'Tarix',
  StartDate: 'Başlama', EndDate: 'Bitmə', DueDate: 'Son tarix', IssueDate: 'Buraxılış tarixi',
};

const fieldLabel = (f) => FIELD_LABELS[f] ?? f;

function ChangesView({ changes, action }) {
  let parsed = [];
  try { parsed = JSON.parse(changes ?? '[]'); } catch { /* boş */ }

  if (parsed.length === 0)
    return <p className="text-sm text-slate-400 px-1">Detal yoxdur.</p>;

  return (
    <div className="space-y-1.5">
      {parsed.map((c, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-2 text-sm">
          <span className="font-medium text-slate-600 min-w-32">{fieldLabel(c.field)}:</span>
          {action === 'Updated' ? (
            <>
              <span className="rounded bg-red-50 text-red-700 px-2 py-0.5 line-through decoration-red-400">
                {c.old ?? '—'}
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded bg-green-50 text-green-700 px-2 py-0.5">{c.new ?? '—'}</span>
            </>
          ) : (
            <span className="rounded bg-green-50 text-green-700 px-2 py-0.5">{c.new ?? '—'}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityTypes, setEntityTypes] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    const params = { page, pageSize: 20 };
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    api.get('/audit-logs', { params }).then(({ data }) => setResult(data));
  }, [page, entityType, action]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/audit-logs/entity-types').then(({ data }) => setEntityTypes(data));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Log mərkəzi</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        >
          <option value="">Bütün obyektlər</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{entityLabel(t)}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        >
          <option value="">Bütün əməliyyatlar</option>
          <option value="Created">Yaradıldı</option>
          <option value="Updated">Yeniləndi</option>
          <option value="Deleted">Silindi</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow divide-y divide-slate-100">
        {result.items.map((log) => {
          const a = ACTIONS[log.action] ?? { text: log.action, cls: 'bg-slate-100', icon: '•' };
          const isOpen = expanded === log.id;
          return (
            <div key={log.id}>
              <button
                onClick={() => setExpanded(isOpen ? null : log.id)}
                className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-slate-50"
              >
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${a.cls}`}>
                  {a.icon} {a.text}
                </span>
                <span className="font-medium text-slate-800 shrink-0">
                  {entityLabel(log.entityType)} #{log.entityId}
                </span>
                <span className="text-sm text-slate-500 flex-1 truncate">
                  {log.userName} tərəfindən
                </span>
                <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                  {new Date(log.createdAtUtc + 'Z').toLocaleString('az')}
                </span>
                <span className="text-slate-400">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-1 bg-slate-50/60">
                  <ChangesView changes={log.changes} action={log.action} />
                </div>
              )}
            </div>
          );
        })}
        {result.items.length === 0 && (
          <p className="px-5 py-10 text-center text-slate-400">Log tapılmadı.</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
        <span>Cəmi: {result.totalCount} qeyd</span>
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
    </div>
  );
}
