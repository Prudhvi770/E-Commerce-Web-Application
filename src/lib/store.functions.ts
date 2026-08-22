import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Order, Product } from "./types";

const PRODUCT_COLUMNS = "id, name, description, category, price_cents, stock, image_url, active";
const ORDER_COLUMNS =
  "id, user_id, status, total_cents, full_name, email, shipping_address, created_at, order_items ( id, product_id, product_name, unit_price_cents, quantity )";

/** Public catalog read — no session required. */
export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { getPublicClient } = await import("./store.server");
  const { data, error } = await getPublicClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
});

/** Every product, including hidden ones — admin only. */
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Product[]> => {
    const { data, error } = await context.supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Product[];
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, display_name").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return {
      userId: context.userId,
      displayName: profile?.display_name ?? "",
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      fullName: string;
      email: string;
      address: string;
      items: { productId: string; quantity: number }[];
    }) => {
      if (!input.fullName.trim()) throw new Error("Full name is required");
      if (!input.email.trim()) throw new Error("Email is required");
      if (!input.address.trim()) throw new Error("Shipping address is required");
      if (!input.items.length) throw new Error("Your cart is empty");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ids = data.items.map((i) => i.productId);
    const { data: products, error: productError } = await context.supabase
      .from("products")
      .select("id, name, price_cents, stock")
      .in("id", ids);
    if (productError) throw new Error(productError.message);

    const priced = data.items.map((item) => {
      const product = (products ?? []).find((p) => p.id === item.productId);
      if (!product) throw new Error("A product in your cart is no longer available");
      const quantity = Math.max(1, Math.floor(item.quantity));
      if (product.stock < quantity) throw new Error(`Only ${product.stock} left of ${product.name}`);
      return {
        product_id: product.id,
        product_name: product.name,
        unit_price_cents: product.price_cents,
        quantity,
        stock: product.stock,
      };
    });

    const total = priced.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);

    const { data: order, error: orderError } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        total_cents: total,
        full_name: data.fullName.trim(),
        email: data.email.trim(),
        shipping_address: data.address.trim(),
        status: "pending",
      })
      .select("id")
      .single();
    if (orderError || !order) throw new Error(orderError?.message ?? "Could not create the order");

    const { error: itemsError } = await context.supabase.from("order_items").insert(
      priced.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price_cents: i.unit_price_cents,
        quantity: i.quantity,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      priced.map((i) =>
        supabaseAdmin
          .from("products")
          .update({ stock: Math.max(0, i.stock - i.quantity) })
          .eq("id", i.product_id),
      ),
    );

    return { orderId: order.id, total };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Order[]> => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Order[];
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Order[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Order[];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; status: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | undefined;
      name: string;
      description: string;
      category: string;
      price_cents: number;
      stock: number;
      image_url: string;
      active: boolean;
    }) => {
      if (!input.name.trim()) throw new Error("Product name is required");
      if (input.price_cents < 0) throw new Error("Price cannot be negative");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name.trim(),
      description: data.description,
      category: data.category || "general",
      price_cents: Math.round(data.price_cents),
      stock: Math.max(0, Math.round(data.stock)),
      image_url: data.image_url,
      active: data.active,
    };
    const query = data.id
      ? context.supabase.from("products").update(payload).eq("id", data.id)
      : context.supabase.from("products").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
