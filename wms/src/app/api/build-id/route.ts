/**
 * Build identifier endpoint.
 *
 * Returns the current container's BUILD_ID env var (set by CI to the commit
 * SHA). Used by the client-side VersionWatcher to detect deploys and prompt
 * a reload — defeats stale-tab UX after we ship a new image.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    { buildId: process.env.BUILD_ID ?? "dev" },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
