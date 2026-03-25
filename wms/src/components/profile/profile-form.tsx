"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileResult } from "@/features/profile/actions";

export function ProfileForm({
  initialFullName,
  initialNickname,
}: {
  initialFullName: string;
  initialNickname: string | null;
}) {
  const [state, action, pending] = useActionState<ProfileResult | null, FormData>(updateProfile, null);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={initialFullName}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-navy-border dark:bg-navy-surface dark:text-gray-100"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          maxLength={30}
          defaultValue={initialNickname ?? ""}
          placeholder="How you want to be called"
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-navy-border dark:bg-navy-surface dark:text-gray-100"
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
          Shown in the sidebar and around the app instead of your full name.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
        {state?.ok === true && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Saved</span>
        )}
        {state?.ok === false && (
          <span className="text-sm font-medium text-red-600 dark:text-red-400">{state.error}</span>
        )}
      </div>
    </form>
  );
}
