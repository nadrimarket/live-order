\
"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { ShippingType, Product, Session } from "@/lib/types";

export default function SessionOrderPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [postal, setPostal] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");

  const [shipping, setShipping] = useState<ShippingType>("일반");
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setMsg("");
      const res = await fetch(`/api/session/${sessionId}`);
      const json = await res.json();
      if (!res.ok) {
        setMsg(json?.error ?? "세션을 불러오지 못했어요.");
        setLoaded(true);
        return;
      }
      setSession(json.session);
      setProducts(json.products);
      setLoaded(true);
    })();
  }, [sessionId]);

  const total = useMemo(() => {
    const priceById = new Map(products.map(p => [p.id, p.price] as const));
    return Object.entries(qtyById).reduce((sum, [id, q]) => sum + (priceById.get(id) ?? 0) * (q ?? 0), 0);
  }, [qtyById, products]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션이 없어요. {msg}</div>;

  return (
    <main className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">LIVE 주문</div>
          <h1 className="mt-2 text-2xl font-bold">{session.title}</h1>
          {session.is_closed && (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
              이 방송은 마감되었습니다. (추가 주문 불가)
            </div>
          )}
        </div>
        <a className="btn" href="/">처음</a>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">닉네임</label>
            <input className="input mt-1" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" />
          </div>
          <div>
            <label className="text-sm font-semibold">연락처</label>
            <input className="input mt-1" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="text-sm font-semibold">배송</label>
            <select className="input mt-1" value={shipping} onChange={(e) => setShipping(e.target.value as ShippingType)}>
              <option value="일반">일반</option>
              <option value="제주/도서">제주/도서</option>
              <option value="픽업">픽업</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">우편번호</label>
            <input className="input mt-1" value={postal} onChange={(e)=>setPostal(e.target.value)} placeholder="예) 06236" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">주소</label>
            <input className="input mt-1" value={addr1} onChange={(e)=>setAddr1(e.target.value)} placeholder="예) 서울시 강남구..." />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-semibold">상세주소</label>
            <input className="input mt-1" value={addr2} onChange={(e)=>setAddr2(e.target.value)} placeholder="동/호수, 공동현관 비번 등" />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <div className="text-sm font-semibold">현재 합계</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{total.toLocaleString("ko-KR")}원</div>
          </div>
          <div className="small">주문 제출 후 “수정 링크(토큰)”이 생성됩니다.</div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">오늘 판매 물품</h2>
          <span className="badge">{products.filter(p=>p.is_active).length}개</span>
        </div>
        <ProductGrid
          products={products.filter(p=>p.is_active)}
          qtyById={qtyById}
          setQty={(id, qty) => setQtyById((prev) => ({ ...prev, [id]: qty }))}
        />
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">주문 제출</div>
          <div className="text-sm text-slate-600 tabular-nums">합계 {total.toLocaleString("ko-KR")}원</div>
        </div>

        {msg && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">{msg}</div>}

        <button
          className="btnPrimary w-full"
          disabled={session.is_closed}
          onClick={async () => {
            setMsg("");
            try {
              const nn = nickname.trim();
              if (!nn) throw new Error("닉네임을 입력하세요.");
              if (!phone.trim()) throw new Error("연락처를 입력하세요.");
              if (shipping !== "픽업" && !addr1.trim()) throw new Error("주소를 입력하세요. (픽업은 주소 생략 가능)");
              const lines = Object.entries(qtyById)
                .map(([product_id, qty]) => ({ product_id, qty: Number(qty) || 0 }))
                .filter((l) => l.qty > 0);
              if (lines.length === 0) throw new Error("수량을 1개 이상 담아주세요.");

              const res = await fetch("/api/order/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId,
                  nickname: nn,
                  shipping,
                  phone: phone.trim(),
                  postal_code: postal.trim(),
                  address1: addr1.trim(),
                  address2: addr2.trim(),
                  lines,
                }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.error ?? "주문 저장 실패");

              setQtyById({});
              setMsg(
                `✅ 주문이 접수되었습니다!\\n` +
                `- 수정 링크: ${location.origin}/order/edit/${json.editToken}\\n` +
                `- 정산서(JPG): ${location.origin}/receipt/token/${json.editToken}`
              );
            } catch (e: any) {
              setMsg(`❗ ${e?.message ?? "오류가 발생했어요."}`);
            }
          }}
        >
          주문 제출하기
        </button>
      </section>
    </main>
  );
}
