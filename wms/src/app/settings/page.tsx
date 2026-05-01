import Link from "next/link";
import { Settings, Key, Bell, Barcode, Warehouse } from "lucide-react";

export default function SettingsPage() {
  const sections = [
    {
      href: "/settings/profile",
      icon: <Settings className="h-5 w-5 text-gray-500" />,
      label: "Profile",
      description: "Your account details and preferences.",
    },
    {
      href: "/settings/api-keys",
      icon: <Key className="h-5 w-5 text-amber-500" />,
      label: "API Keys",
      description: "Manage API keys for external integrations.",
    },
    {
      href: "/settings/notifications",
      icon: <Bell className="h-5 w-5 text-blue-500" />,
      label: "Notification Preferences",
      description: "Control which notifications you receive.",
    },
    {
      href: "/settings/barcode",
      icon: <Barcode className="h-5 w-5 text-green-500" />,
      label: "Barcode Configuration",
      description: "Default barcode format and prefix per warehouse.",
    },
    {
      href: "/settings/warehouse",
      icon: <Warehouse className="h-5 w-5 text-violet-500" />,
      label: "Warehouse Defaults",
      description: "Default workflow template, timezone, and capacity.",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          System configuration and preferences.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md dark:border-navy-border dark:bg-navy-surface dark:hover:border-blue-500/30"
          >
            <div className="flex items-center gap-3">
              {s.icon}
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {s.label}
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {s.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
