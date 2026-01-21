"use client";

import { Product } from "@/lib/types";

export function ProductGrid({
  products,
  qtyById,
  setQty,
}: {
  products: Product[];
  qtyById: Record<string, number>;
  setQty: (id: string, qty: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {products.map((p) => {
        const qty = qtyById[p.id] ?? 0;
        const soldout = !!(p as any).is_soldout;

        return (
          <div key={p.id} className={`card overflow-hidden ${soldout ? "opacity-70" : ""}`}>
            <div className="relative">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 w-full bg-slate-100" />
              )}

              {soldout && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="rounded-xl bg-white/95 px-4 py-2 font-bold">품절</div>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold flex items-center gap-2">
                    <span>{p.name}</span>
                    {soldout && <span className="badge">품절</span>}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {p.price.toLocaleString("ko-KR")}원
                  </div>
                </div>
                <div className="badge">{qty}개</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    className="btn"
                    disabled={soldout}
                    onClick={() => setQty(p.id, Math.max(0, qty - 1))}
                    title={soldout ? "품절 상품은 주문할 수 없어요" : "수량 감소"}
                  >
                    -
                  </button>

                  <input
                    className="input w-20 text-center tabular-nums"
                    value={qty}
                    inputMode="numeric"
                    disabled={soldout}
                    onChange={(e) => {
                      if (soldout) return;
                      const v = Number(String(e.target.value).replace(/[^0-9]/g, ""));
                      setQty(p.id, Number.isFinite(v) ? v : 0);
                    }}
                  />

                  <button
                    className="btn"
                    disabled={soldout}
                    onClick={() => setQty(p.id, qty + 1)}
                    title={soldout ? "품절 상품은 주문할 수 없어요" : "수량 증가"}
                  >
                    +
                  </button>
                </div>

                <div className="text-sm text-slate-600 tabular-nums">
                  {(qty * p.price).toLocaleString("ko-KR")}원
                </div>
              </div>

              {soldout && (
                <div className="mt-3 text-sm text-slate-600">
                  품절된 상품입니다. 주문할 수 없어요.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
