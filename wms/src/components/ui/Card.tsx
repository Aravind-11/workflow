export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>{children}</div>;
}
