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
    <label className="space-y-1.5">
      <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-200/70 bg-white px-3 text-[13px] text-slate-800 outline-none transition-colors duration-150 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-100 dark:hover:border-white/[0.16] dark:focus:border-white/[0.24] dark:focus:ring-white/[0.06]"
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
    <div className="space-y-4 border-y border-slate-200/60 py-4 dark:border-white/[0.06]">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="min-w-[220px] flex-1 space-y-1.5">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Search
          </span>
          <div className="flex gap-2">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Warehouse name or code"
              className="h-9 w-full rounded-md border border-slate-200/70 bg-white px-3 text-[13px] text-slate-800 outline-none transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.16] dark:focus:border-white/[0.24] dark:focus:ring-white/[0.06]"
            />
            <Button variant="secondary" onClick={applySearch}>
              Apply
            </Button>
          </div>
        </label>

        <div className="ml-auto inline-flex border border-slate-200/70 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => updateParam("view", "grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] transition-colors duration-150 ${
              currentView === "grid"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => updateParam("view", "list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] transition-colors duration-150 ${
              currentView === "list"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Country" value={initialValues.country} options={facets.countries} onChange={(value) => updateParam("country", value || undefined)} />
        <SelectField label="State" value={initialValues.state} options={facets.states} onChange={(value) => updateParam("state", value || undefined)} />
        <SelectField label="Region" value={initialValues.region} options={facets.regions} onChange={(value) => updateParam("region", value || undefined)} />
        <SelectField label="City" value={initialValues.city} options={facets.cities} onChange={(value) => updateParam("city", value || undefined)} />
      </div>
    </div>
  );
}
