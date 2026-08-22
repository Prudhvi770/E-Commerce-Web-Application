import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lines, totalCents, setQuantity, remove } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="size-4 text-primary" /> Your cart
          </SheetTitle>
          <SheetDescription>Items are saved on this device until you check out.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {lines.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            lines.map((line) => (
              <div key={line.productId} className="flex gap-3 rounded-lg border border-border bg-background p-3">
                <img
                  src={line.imageUrl}
                  alt={line.name}
                  loading="lazy"
                  width={64}
                  height={64}
                  className="size-16 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
                  <p className="text-sm text-primary">{formatPrice(line.priceCents)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      aria-label={`Decrease quantity of ${line.name}`}
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      aria-label={`Increase quantity of ${line.name}`}
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto size-7 text-muted-foreground"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => remove(line.productId)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <SheetFooter className="border-t border-border">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-lg font-semibold text-foreground">{formatPrice(totalCents)}</span>
          </div>
          <Button asChild disabled={lines.length === 0} className="w-full">
            <Link to="/checkout" onClick={() => onOpenChange(false)}>
              Checkout
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
