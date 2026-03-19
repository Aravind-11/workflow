const US_STATES = ["All", "AZ", "CA", "TX", "IL", "GA", "NY", "FL", "WA", "OH", "PA"];

export default function WarehouseFilter({
  state,
  onStateChange,
}: {
  state: string;
  onStateChange: (value: string) => void;
}) {
  return (
    <select
      className="rounded-lg border px-3 py-2 text-sm"
      value={state}
      onChange={(event) => onStateChange(event.target.value)}
    >
      {US_STATES.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );
}
