"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { Product, ShippingType } from "@/lib/types";

export default function OrderEdit({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loaded, setLoaded] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [postal, setPostal] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");

  const [shipping, setShipping] = useState<ShippingType>("일반");
  const [products, setProducts] = useState<Product[]>([]);
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/order/by-token?token=${encodeURIComponent(token)}`);
      const j = await res.json();
      if (!res.ok) { setMsg(j?.error ?? "불러오기 실패"); setLoaded(true); return; }
      setIsClosed(j.session?.is_closed ?? false);
      setNickname(j.order.nickname);
      setShipping(j.order.shipping);
      setPhone(j.order.phone ?? "");
      setPostal(j.order.postal_code ?? "");
      setAddr1(j.order.address1 ?? "");
      setAddr2(j.order.address2 ?? "");
      setProducts(j.products);
      setQtyById(j.qtyById);
      setLoaded(true);
    })();
  }, [token]);

  const total = useMemo(() => {
    const priceById = new Map(products.map(p => [p.id, p.price] as const));
    return Object.entries(qtyById).reduce((sum, [id, q]) => sum + (priceById.get(id) ?? 0) * (q ?? 0), 0);
  }, [qtyById, products]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!products.length) return <div className="text-slate-600">주문을 찾을 수 없어요. {msg}</div>;

  return (
    <main className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">주문 수정</div>
          <h1 className="mt-2 text-2xl font-bold">{nickname}</h1>
          {isClosed && (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
              방송이 마감되어 고객 수정이 제한됩니다. (관리자에게 요청)
            </div>
          )}
        </div>
        <a className="btn" href={`/receipt/token/${token}`}>정산서 보기</a>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">닉네임</label>
            <input className="input mt-1" value={nickname} onChange={(e)=>setNickname(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">연락처</label>
            <input className="input mt-1" value={phone} onChange={(e)=>setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">배송</label>
            <select className="input mt-1" value={shipping} onChange={(e)=>setShipping(e.target.value as ShippingType)}>
              <option value="일반">일반</option>
              <option value="제주/도서">제주/도서</option>
              <option value="픽업">픽업</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">우편번호</label>
            <input className="input mt-1" value={postal} onChange={(e)=>setPostal(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">주소</label>
            <input className="input mt-1" value={addr1} onChange={(e)=>setAddr1(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-semibold">상세주소</label>
            <input className="input mt-1" value={addr2} onChange={(e)=>setAddr2(e.target.value)} />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm font-semibold">현재 합계</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{total.toLocaleString("ko-KR")}원</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">수량 수정</h2>
          <span className="badge">{products.length}개</span>
        </div>
        <ProductGrid
          products={products.filter(p=>p.is_active)}
          qtyById={qtyById}
          setQty={(id, qty) => setQtyById((prev) => ({ ...prev, [id]: qty }))}
        />
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        {msg && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">{msg}</div>}
        <button className="btnPrimary w-full" disabled={isClosed} onClick={async ()=>{
          setMsg("");
          try{
            if(!nickname.trim()) throw new Error("닉네임을 입력하세요.");
            if(!phone.trim()) throw new Error("연락처를 입력하세요.");
            if(shipping !== "픽업" && !addr1.trim()) throw new Error("주소를 입력하세요. (픽업은 주소 생략 가능)");
            const lines = Object.entries(qtyById).map(([product_id, qty])=>({ product_id, qty:Number(qty)||0 })).filter(l=>l.qty>0);
            if(lines.length===0) throw new Error("수량을 1개 이상 담아주세요.");
            const res = await fetch("/api/order/update", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({
              token,
              nickname: nickname.trim(),
              shipping,
              phone: phone.trim(),
              postal_code: postal.trim(),
              address1: addr1.trim(),
              address2: addr2.trim(),
              lines
            })});
            const j = await res.json();
            if(!res.ok) throw new Error(j?.error ?? "저장 실패");
            setMsg("✅ 수정 저장 완료!");
          }catch(e:any){
            setMsg(`❗ ${e?.message ?? "오류"}`);
          }
        }}>수정 저장</button>
      </section>
    </main>
  );
}
