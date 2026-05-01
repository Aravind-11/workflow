export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgb(15_23_42_/_0.06),0_1px_2px_rgb(15_23_42_/_0.04)] dark:bg-[rgb(12_16_24_/_0.7)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.06),0_1px_2px_rgb(0_0_0_/_0.3)] ${className}`}
    >
      {children}
    </div>
  );
}
