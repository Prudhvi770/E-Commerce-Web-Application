import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { listMyOrders } from "@/lib/store.functions";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My orders — VOLT Store" },
      { name: "description", content: "Track the status of every order you placed at VOLT." },
      { property: "og:title", content: "My orders — VOLT Store" },
      { property: "og:description", content: "Track the status of every order you placed at VOLT." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => fetchOrders(),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">My orders</h1>

        {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}

        {!isLoading && (orders ?? []).length === 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">You haven't placed an order yet.</p>
              <Button asChild className="mt-4">
                <Link to="/">Start shopping</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {(orders ?? []).map((order) => (
            <Card key={order.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="font-mono text-sm">#{order.id.slice(0, 8)}</CardTitle>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <Badge variant="outline" className="border-primary/40 capitalize text-primary">
                  {order.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.unit_price_cents * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total_cents)}</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">Ships to {order.shipping_address}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
