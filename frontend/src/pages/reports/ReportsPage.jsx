import { useRef, useState } from 'react';
import { PageHeader, Button, Select } from '../../components/ui';
import { notify } from '../../notify';
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

const SectionTitle = ({ children }) => (
  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
    {children}
  </h3>
);

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
      notify.success('Hesabat yükləndi.');
    } catch {
      notify.error('Hesabatı yükləmək mümkün olmadı.');
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { data } = await api.get(`/reports/${importKind}/import-template`, { responseType: 'blob' });
      downloadBlob(data, `${importKind}_template.xlsx`);
    } catch {
      notify.error('Şablonu yükləmək mümkün olmadı.');
    }
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
      notify.success(`${data.addedCount} qeyd import edildi.`);
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
      <PageHeader
        title="Hesabatlar"
        description="Bütün modullar üzrə Excel export və toplu məlumat importu"
      />

      {/* Excel export */}
      <SectionTitle>📊 Excel export</SectionTitle>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((r) => (
          <div
            key={r.key}
            className="flex flex-col rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-2xl">
              {r.icon}
            </div>
            <h4 className="font-semibold tracking-tight text-slate-800">{r.label}</h4>
            <p className="mb-4 flex-1 text-sm text-slate-500">{r.desc}</p>
            <Button
              onClick={() => exportReport(r.key)}
              loading={busy === r.key}
              className="w-full"
            >
              {busy === r.key ? 'Hazırlanır...' : '⬇ Excel yüklə'}
            </Button>
          </div>
        ))}
      </div>

      {/* Excel import */}
      <SectionTitle>📥 Excel import</SectionTitle>
      <div className="max-w-2xl rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Select
            label="Nə import edilir?"
            className="w-48"
            value={importKind}
            onChange={(e) => { setImportKind(e.target.value); setImportResult(null); }}
          >
            {IMPORTS.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={downloadTemplate}>
            ⬇ Şablonu yüklə
          </Button>
          <Button onClick={() => fileRef.current?.click()} loading={busy === 'import'}>
            {busy === 'import' ? 'Yüklənir...' : '⬆ Fayl seç və import et'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={onImport}
          />
        </div>

        <p className="mb-4 text-xs text-slate-400">
          Qayda: əvvəlcə şablonu yükləyin, doldurun, sonra faylı seçin.
          Hər hansı sətirdə xəta olarsa <b>heç nə</b> import edilmir (all-or-nothing).
        </p>

        {importResult && (
          importResult.errors?.length ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
              <p className="mb-2 font-semibold text-red-700">
                Import edilmədi — {importResult.errors.length} xəta:
              </p>
              <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-red-600">
                {importResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              ✅ {importResult.addedCount} qeyd uğurla import edildi.
            </div>
          )
        )}
      </div>
    </div>
  );
}
