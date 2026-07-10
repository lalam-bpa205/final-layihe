// Form sahələri — label + error dəstəyi ilə. React 19-da `ref` adi prop kimi
// ötürüldüyündən react-hook-form register(...) spread-i birbaşa işləyir.

const baseCls = (error) =>
  `w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
    error ? 'border-red-300' : 'border-slate-300'
  }`;

function FieldWrap({ label, required, error, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ label, required, error, className, ...props }) {
  return (
    <FieldWrap label={label} required={required} error={error} className={className}>
      <input className={baseCls(error)} {...props} />
    </FieldWrap>
  );
}

export function Select({ label, required, error, className, children, ...props }) {
  return (
    <FieldWrap label={label} required={required} error={error} className={className}>
      <select className={baseCls(error)} {...props}>
        {children}
      </select>
    </FieldWrap>
  );
}

export function Textarea({ label, required, error, className, rows = 3, ...props }) {
  return (
    <FieldWrap label={label} required={required} error={error} className={className}>
      <textarea rows={rows} className={baseCls(error)} {...props} />
    </FieldWrap>
  );
}
