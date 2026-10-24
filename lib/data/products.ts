import { isDemoMode } from "@/lib/env";
import { CONFIG_ERROR, friendlyError, UserFacingError } from "@/lib/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Product, ProductInput } from "@/lib/types";

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new UserFacingError(CONFIG_ERROR);
  return supabase;
}

export async function listProducts(activeOnly = false): Promise<Product[]> {
  if (isDemoMode) {
    const { demoListProducts } = await import("@/lib/demo/api");
    return demoListProducts(activeOnly);
  }

  let query = client().from("products").select("*").order("name", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new UserFacingError(friendlyError(error, "Gagal memuat menu."));
  return (data ?? []) as Product[];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (isDemoMode) {
    const { demoCreateProduct } = await import("@/lib/demo/api");
    return demoCreateProduct(input);
  }

  const { data, error } = await client()
    .from("products")
    .insert({
      name: input.name,
      price: input.price,
      image_url: input.image_url ?? null,
      is_active: input.is_active ?? true,
    })
    .select("*")
    .single();

  if (error) throw new UserFacingError(friendlyError(error, "Gagal menyimpan menu."));
  return data as Product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  if (isDemoMode) {
    const { demoUpdateProduct } = await import("@/lib/demo/api");
    return demoUpdateProduct(id, input);
  }

  const { data, error } = await client()
    .from("products")
    .update({
      name: input.name,
      price: input.price,
      image_url: input.image_url ?? null,
      is_active: input.is_active,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new UserFacingError(friendlyError(error, "Gagal menyimpan menu."));
  return data as Product;
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  if (isDemoMode) {
    const { demoSetProductActive } = await import("@/lib/demo/api");
    demoSetProductActive(id, isActive);
    return;
  }

  const { error } = await client()
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new UserFacingError(friendlyError(error, "Gagal mengubah status menu."));
}
