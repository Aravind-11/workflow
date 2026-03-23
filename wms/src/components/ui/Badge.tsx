export default function Badge({ text }: { text: string }) {
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">{text}</span>;
}
