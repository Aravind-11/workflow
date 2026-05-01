import "server-only";

// Thin re-export shim so older imports keep working. The single source of
// truth for nav customization is now `@/lib/nav/state`, which stores
// labels + hidden + custom operations in one cookie.
export { getNavLabelOverrides, type NavLabelOverrides } from "@/lib/nav/state";
