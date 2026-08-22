import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { listProducts } from "@/lib/store.functions";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart";

const productsQuery = queryOptions({
  queryKey: ["products", "public"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VOLT — Desk & Audio Tech Store" },
      {
        name: "description",
        content:
          "Shop mechanical keyboards, ANC headphones, monitors and desk gear. Fast checkout and live order tracking.",
      },
      { property: "og:title", content: "VOLT — Desk & Audio Tech Store" },
      {
        property: "og:description",
        content: "Mechanical keyboards, ANC headphones, monitors and desk gear with live order tracking.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Storefront,
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <p className="text-sm text-muted-foreground">We couldn't load the catalog. Please refresh.</p>
    </main>
  ),
});

function Storefront() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { add } = useCart();
  const [category, setCategory] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );
  const visible = useMemo(
    () => (category === "All" ? products : products.filter((p) => p.category === category)),
    [products, category],
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="grid-noise border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <Badge variant="outline" className="mb-5 border-primary/40 text-primary">
              <Sparkles className="mr-1 size-3" /> New season drop
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] md:text-6xl">
              <span className="text-gradient-volt">Gear that keeps up</span> with the way you work.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              Keyboards, audio and displays picked for people who spend real hours at the desk. Free
              shipping over $150, 30-day returns.
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Truck className="size-4 text-primary" /> 2-day delivery
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> 2-year warranty
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <h2 className="mr-4 text-xl font-semibold">Catalog</h2>
            {categories.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === category ? "default" : "outline"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden border-border bg-card pt-0 transition-shadow hover:card-glow"
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="aspect-square w-full object-cover"
                />
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium leading-tight">{product.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {product.category}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-semibold text-primary">
                      {formatPrice(product.price_cents)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                    </span>
                    <Button
                      size="sm"
                      disabled={product.stock === 0}
                      onClick={() => {
                        add({
                          productId: product.id,
                          name: product.name,
                          priceCents: product.price_cents,
                          imageUrl: product.image_url,
                        });
                        toast.success(`${product.name} added to cart`);
                      }}
                    >
                      Add to cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        VOLT — built with Lovable Cloud.
      </footer>
    </div>
  );
}
