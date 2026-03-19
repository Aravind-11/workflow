import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
      <p className="mt-2 text-sm text-gray-500">
        Your account doesn&apos;t have permission to view this page. Contact an admin to get the right role assigned.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
