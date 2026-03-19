import { revalidatePath } from "next/cache";

export function revalidateLogisticsPages() {
  revalidatePath("/receiving");
  revalidatePath("/shipping");
  revalidatePath("/picking");
  revalidatePath("/packing");
  revalidatePath("/deliveries");
}

export async function nextDoc(prefix: string, code: string) {
  return `${prefix}-${code}-${Date.now().toString(36).toUpperCase()}`;
}
