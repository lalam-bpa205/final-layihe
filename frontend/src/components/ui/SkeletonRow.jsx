// Cədvəl üçün yüklənmə skeleti. `rows` qədər sətir, `cols` qədər hüceyrə çəkir.
export default function SkeletonRow({ cols = 4, withAvatar = false }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          {i === 0 && withAvatar ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
            </div>
          ) : (
            <div className={`h-3.5 rounded bg-slate-200 ${i % 3 === 1 ? 'w-24' : 'w-16'}`} />
          )}
        </td>
      ))}
    </tr>
  );
}

export function SkeletonRows({ rows = 5, cols = 4, withAvatar = false }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} withAvatar={withAvatar} />
      ))}
    </>
  );
}
