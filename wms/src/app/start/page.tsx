import { requireAuth } from "@/lib/auth/session";
import { StartScreen } from "@/components/start/start-screen";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const ctx = await requireAuth();
  const isAdmin = ctx.roleNames.includes("admin");
  return (
    <StartScreen
      userLabel={ctx.nickname ?? ctx.fullName ?? ctx.email}
      isAdmin={isAdmin}
    />
  );
}
