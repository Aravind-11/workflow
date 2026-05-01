export default function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:bg-white/[0.02] dark:text-slate-400">
            {headers.map((header, i) => (
              <th
                key={header}
                className={`px-4 py-3 font-medium ${i === 0 ? "first:pl-5" : ""} ${i === headers.length - 1 ? "last:pr-5" : ""}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:transition-colors [&>tr+tr]:border-t [&>tr+tr]:border-slate-100 [&>tr:hover]:bg-slate-50/50 dark:[&>tr+tr]:border-white/5 dark:[&>tr:hover]:bg-white/[0.03]">
          {children}
        </tbody>
      </table>
    </div>
  );
}
