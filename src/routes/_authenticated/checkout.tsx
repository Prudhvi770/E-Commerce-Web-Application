import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { placeOrder } from "@/lib/store.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — VOLT Store" },
      { name: "description", content: "Review your cart and place your VOLT order." },
      { property: "og:title", content: "Checkout — VOLT Store" },
      { property: "og:description", content: "Review your cart and place your VOLT order." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { lines, totalCents, clear } = useCart();
  const submitOrder = useServerFn(placeOrder);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitOrder({
        data: {
          fullName,
          email,
          address,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        },
      });
      clear();
      toast.success("Order placed");
      navigate({ to: "/orders" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place the order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>

        {lines.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Button asChild className="mt-4">
                <Link to="/">Browse the catalog</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Shipping details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Shipping address</Label>
                    <Textarea
                      id="address"
                      required
                      rows={4}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Placing order…" : `Place order · ${formatPrice(totalCents)}`}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="h-fit border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lines.map((line) => (
                  <div key={line.productId} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {line.name} × {line.quantity}
                    </span>
                    <span>{formatPrice(line.priceCents * line.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-3 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(totalCents)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
