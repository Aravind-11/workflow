import { requireAuth } from "@/lib/auth/session";

export default async function StartLayout({ children }: { children: React.ReactNode }) {
  // Anyone who lands here must at least be signed in. The role picker
  // itself is open to any authenticated user.
  await requireAuth();
  return children;
}
