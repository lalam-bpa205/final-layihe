import { useRef, useState } from 'react';
import api from '../../api/axios';

const EXPORTS = [
  { key: 'employees', label: 'İşçilər', icon: '👥', desc: 'Bütün işçilər — şöbə, vəzifə, maaş' },
  { key: 'products', label: 'Məhsullar', icon: '📦', desc: 'Məhsul kataloqu + cari stok' },
  { key: 'stock', label: 'Anbar qalıqları', icon: '🏭', desc: 'Anbar üzrə stok qalıqları' },
  { key: 'finance', label: 'Maliyyə hesabatı', icon: '💰', desc: 'Gəlir/xərc + yekun mənfəət' },
  { key: 'sales-orders', label: 'Satış sifarişləri', icon: '📤', desc: 'Sifarişlər və fakturalar' },
  { key: 'deliveries', label: 'Çatdırılmalar', icon: '🚚', desc: 'Marşrut, avtomobil, sürücü' },
];

const IMPORTS = [
  { key: 'products', label: 'Məhsullar' },
  { key: 'customers', label: 'Müştərilər' },
  { key: 'suppliers', label: 'Təchizatçılar' },
];

const downloadBlob = (data, fileName) => {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ReportsPage() {
  const [busy, setBusy] = useState(null);
  const [importKind, setImportKind] = useState('products');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  const exportReport = async (key) => {
    setBusy(key);
    try {
      const { data, headers } = await api.get(`/reports/${key}/excel`, { responseType: 'blob' });
      const match = headers['content-disposition']?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/);
      downloadBlob(data, match?.[1] ?? `${key}.xlsx`);
    } catch {
      alert('Hesabatı yükləmək mümkün olmadı.');
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = async () => {
    const { data } = await api.get(`/reports/${importKind}/import-template`, { responseType: 'blob' });
    downloadBlob(data, `${importKind}_template.xlsx`);
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    setBusy('import');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post(`/reports/${importKind}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
    } catch (err) {
      setImportResult(
        err.response?.data ?? { addedCount: 0, errors: ['Fayl oxuna bilmədi.'] }
      );
    } finally {
      setBusy(null);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Hesabatlar</h2>

      {/* Excel Export */}
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
        📊 Excel export
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {EXPORTS.map((r) => (
          <div key={r.key} className="bg-white rounded-2xl shadow p-5 flex flex-col">
            <div className="text-3xl mb-2">{r.icon}</div>
            <h4 className="font-semibold text-slate-800">{r.label}</h4>
            <p className="text-sm text-slate-500 mb-4 flex-1">{r.desc}</p>
            <button
              onClick={() => exportReport(r.key)}
              disabled={busy === r.key}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
            >
              {busy === r.key ? 'Hazırlanır...' : '⬇ Excel yüklə'}
            </button>
          </div>
        ))}
      </div>

      {/* Excel Import */}
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
        📥 Excel import
      </h3>
      <div className="bg-white rounded-2xl shadow p-6 max-w-2xl">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nə import edilir?</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={importKind}
              onChange={(e) => { setImportKind(e.target.value); setImportResult(null); }}
            >
              {IMPORTS.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={downloadTemplate}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ Şablonu yüklə
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy === 'import'}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
          >
            {busy === 'import' ? 'Yüklənir...' : '⬆ Fayl seç və import et'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={onImport}
          />
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Qayda: əvvəlcə şablonu yükləyin, doldurun, sonra faylı seçin.
          Hər hansı sətirdə xəta olarsa <b>heç nə</b> import edilmir (all-or-nothing).
        </p>

        {importResult && (
          importResult.errors?.length ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm">
              <p className="font-semibold text-red-700 mb-2">
                Import edilmədi — {importResult.errors.length} xəta:
              </p>
              <ul className="list-disc pl-5 text-red-600 space-y-0.5 max-h-48 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-medium">
              ✅ {importResult.addedCount} qeyd uğurla import edildi.
            </div>
          )
        )}
      </div>
    </div>
  );
}
