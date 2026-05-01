"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition-all duration-150 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      <LogOut size={14} />
      Sign out
    </button>
  );
}
