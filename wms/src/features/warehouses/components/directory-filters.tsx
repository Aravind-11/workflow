"use client";

import { Grid3X3, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type OptionSet = {
  countries: string[];
  states: string[];
  regions: string[];
  cities: string[];
};

type Props = {
  facets: OptionSet;
  initialValues: {
    country: string;
    state: string;
    region: string;
    city: string;
    search: string;
    view: "grid" | "list";
  };
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-navy-border dark:bg-navy dark:text-gray-200"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DirectoryFilters({ facets, initialValues }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const [searchText, setSearchText] = useState(initialValues.search);

  const currentView = useMemo(() => {
    const view = params.get("view");
    return view === "list" ? "list" : "grid";
  }, [params]);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const applySearch = () => updateParam("search", searchText.trim() || undefined);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</span>
          <div className="flex gap-2">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Warehouse name or code"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200 dark:placeholder-gray-500"
            />
            <Button variant="secondary" onClick={applySearch}>
              Apply
            </Button>
          </div>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={currentView === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => updateParam("view", "grid")}
          >
            <Grid3X3 className="h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={currentView === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => updateParam("view", "list")}
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Country" value={initialValues.country} options={facets.countries} onChange={(value) => updateParam("country", value || undefined)} />
        <SelectField label="State" value={initialValues.state} options={facets.states} onChange={(value) => updateParam("state", value || undefined)} />
        <SelectField label="Region" value={initialValues.region} options={facets.regions} onChange={(value) => updateParam("region", value || undefined)} />
        <SelectField label="City" value={initialValues.city} options={facets.cities} onChange={(value) => updateParam("city", value || undefined)} />
      </div>
    </div>
  );
}
