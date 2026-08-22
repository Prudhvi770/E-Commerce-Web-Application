import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SiteHeader } from "@/components/SiteHeader";
import {
  adminListOrders,
  adminListProducts,
  deleteProduct,
  getMe,
  saveProduct,
  updateOrderStatus,
} from "@/lib/store.functions";
import { formatDate, formatPrice } from "@/lib/format";
import { ORDER_STATUSES, type Product } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — VOLT Store" },
      { name: "description", content: "Manage the VOLT product catalog and fulfil customer orders." },
      { property: "og:title", content: "Admin — VOLT Store" },
      { property: "og:description", content: "Manage the VOLT product catalog and fulfil customer orders." },
    ],
  }),
  component: AdminPage,
});

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  category: "general",
  price: "0",
  stock: "0",
  image_url: "",
  active: true,
};

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const fetchProducts = useServerFn(adminListProducts);
  const fetchOrders = useServerFn(adminListOrders);
  const saveProductFn = useServerFn(saveProduct);
  const deleteProductFn = useServerFn(deleteProduct);
  const updateStatusFn = useServerFn(updateOrderStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const isAdmin = me?.isAdmin ?? false;

  const { data: products } = useQuery({
    queryKey: ["products", "admin"],
    queryFn: () => fetchProducts(),
    enabled: isAdmin,
  });
  const { data: orders } = useQuery({
    queryKey: ["orders", "admin"],
    queryFn: () => fetchOrders(),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveProductFn({
        data: {
          id: form.id,
          name: form.name,
          description: form.description,
          category: form.category,
          price_cents: Math.round(Number(form.price) * 100),
          stock: Number(form.stock),
          image_url: form.image_url,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved");
      setDialogOpen(false);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { orderId: string; status: string }) => updateStatusFn({ data: input }),
    onSuccess: () => {
      toast.success("Order updated");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: (product.price_cents / 100).toFixed(2),
      stock: String(product.stock),
      image_url: product.image_url,
      active: product.active,
    });
    setDialogOpen(true);
  }

  if (!meLoading && !isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have the admin role, so this dashboard is unavailable.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Admin dashboard</h1>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="pt-4">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Catalog</CardTitle>
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setForm(emptyForm);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-1 size-4" /> New product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
                    </DialogHeader>
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveMutation.mutate();
                      }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="p-name">Name</Label>
                        <Input
                          id="p-name"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-desc">Description</Label>
                        <Textarea
                          id="p-desc"
                          rows={3}
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="p-price">Price (USD)</Label>
                          <Input
                            id="p-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="p-stock">Stock</Label>
                          <Input
                            id="p-stock"
                            type="number"
                            min="0"
                            value={form.stock}
                            onChange={(e) => setForm({ ...form, stock: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-cat">Category</Label>
                        <Input
                          id="p-cat"
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-image">Image URL</Label>
                        <Input
                          id="p-image"
                          placeholder="/products/keyboard.jpg"
                          value={form.image_url}
                          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          id="p-active"
                          checked={form.active}
                          onCheckedChange={(v) => setForm({ ...form, active: v })}
                        />
                        <Label htmlFor="p-active">Visible in store</Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                        Save product
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products ?? []).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.category}</TableCell>
                        <TableCell className="text-right">{formatPrice(product.price_cents)}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Live" : "Hidden"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => deleteMutation.mutate(product.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="pt-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">All orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(orders ?? []).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
                )}
                {(orders ?? []).map((order) => (
                  <div key={order.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.full_name} · {order.email} · {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-primary">{formatPrice(order.total_cents)}</span>
                        <Select
                          value={order.status}
                          onValueChange={(status) => statusMutation.mutate({ orderId: order.id, status })}
                        >
                          <SelectTrigger className="w-36 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((status) => (
                              <SelectItem key={status} value={status} className="capitalize">
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {order.order_items.map((item) => (
                        <li key={item.id}>
                          {item.product_name} × {item.quantity} —{" "}
                          {formatPrice(item.unit_price_cents * item.quantity)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">Ships to {order.shipping_address}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
