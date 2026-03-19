import { revalidatePath } from "next/cache";

export function revalidateWorkers() {
  revalidatePath("/workers", "layout");
  revalidatePath("/workers/schedules");
}
