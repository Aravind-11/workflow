import { notFound } from "next/navigation";
import { EditableFlowHeader } from "@/components/ui/EditableFlowHeader";
import { getNavState } from "@/lib/nav/state";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CustomOpLayout({ children, params }: Props) {
  const { slug } = await params;
  const href = `/op/${slug}`;
  const state = await getNavState();
  const op = state.custom.find((c) => c.href === href);
  if (!op) notFound();

  return (
    <div className="space-y-6">
      <EditableFlowHeader
        activeHref={href}
        defaultTitle={op.label}
        description="Custom operation tab. Add whatever workflow your team needs here."
        active={`custom:${slug}`}
        overrides={state.labels}
        hiddenOps={state.hidden}
        customOps={state.custom}
      />
      {children}
    </div>
  );
}
