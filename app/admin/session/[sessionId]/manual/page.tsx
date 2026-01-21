"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, Session } from "@/lib/types";

type ManualLine = { product_id: string; qty: number };
type ShippingType = "택배" | "직거래" | "기타";

export default function AdminManualOrderPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState("");

  // 폼
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [postal, setPostal] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [shipping, setShipping] = useState<ShippingType>("택배");
  const [lines, setLines] = useState<ManualLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function apiJson(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? json?.message ?? `HTTP ${res.status}`);
    return json;
  }

  function setLineQty(product_id: string, qty: number) {
    const safe = Number.isFinite(qty) ? qty : 0;
    setLines((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => x.product_id === product_id);
      if (safe <= 0) {
        if (idx >= 0) next.splice(idx, 1);
        return next;
      }
      if (idx >= 0) next[idx] = { product_id, qty: safe };
      else next.push({ product_id, qty: safe });
      return next;
    });
  }

  const total = useMemo(() => {
    const map = new Map<string, any>();
    (products ?? []).forEach((p: any) => map.set(p.id, p));

    const total_qty = (lines ?? []).reduce((a, l) => a + (Number(l.qty) || 0), 0);
    const total_amount = (lines ?? []).reduce((a, l) => {
      const p = map.get(l.product_id);
      const price = Number(p?.price ?? 0) || 0;
      return a + price * (Number(l.qty) || 0);
    }, 0);

    return { total_qty, total_amount };
  }, [lines, products]);

  async function load() {
    setLoaded(false);
    setMsg("");
    try {
      const j = await apiJson(`/api/admin/session/${sessionId}`, { cache: "no-store" });
      setSession(j.session);
      setProducts(j.products ?? []);
    } catch (e: any) {
      setMsg(e?.message ?? "불러오기 실패");
      setSession(null);
      setProducts([]);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function submit() {
    const nn = nickname.trim();
    if (!nn) return alert("닉네임은 필수입니다.");
    if (!lines.length) return alert("상품/수량을 선택하세요.");

    // 품절 상품 방지(클라)
    const map = new Map<string, any>();
    (products ?? []).forEach((p: any) => map.set(p.id, p));
    for (const l of lines) {
      const p = map.get(l.product_id);
      if (!p) return alert("선택 상품이 목록에 없습니다. 새로고침 후 다시 시도하세요.");
      if (p.is_soldout) return alert(`품절 상품은 담을 수 없습니다: ${p.name}`);
      if (p.deleted_at) return alert(`삭제된 상품은 담을 수 없습니다: ${p.name}`);
    }

    setSubmitting(true);
    try {
      const adminPin = localStorage.getItem("admin_pin") || "";

      const res = await fetch("/api/admin/orders/manual/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminPin ? { "x-admin-pin": adminPin } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          nickname: nn,
          phone: phone.trim(), // 이제 nullable이면 비워도 OK
          postal_code: postal.trim(),
          address1: addr1.trim(),
          address2: addr2.trim(),
          shipping,
          lines,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        alert(j?.message || j?.error || `생성 실패 (HTTP ${res.status})`);
        return;
      }

      alert("수기 주문 생성 완료!");
      location.href = `/admin/session/${sessionId}`; // 생성 후 세션 페이지로 이동
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션 없음. {msg}</div>;

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">수기 주문 추가</h1>
          <div className="mt-1 text-sm text-slate-600">
            세션: <span className="font-semibold">{session.title}</span>
            <span className="ml-3 font-mono text-xs">{session.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={`/admin/session/${sessionId}`}>
            뒤로(세션)
          </a>
          <a className="btn" href={`/s/${sessionId}`}>
            고객 페이지
          </a>
        </div>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">주문자 정보</div>
          <div className="text-sm text-slate-600">
            합계: <span className="font-semibold">{total.total_qty}</span>개 /{" "}
            <span className="font-semibold">{total.total_amount.toLocaleString("ko-KR")}</span>원
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input className="input" placeholder="닉네임* (필수)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input className="input" placeholder="연락처(선택)" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <div className="md:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr]">
            <select className="input" value={shipping} onChange={(e) => setShipping(e.target.value as ShippingType)}>
              <option value="택배">택배</option>
              <option value="직거래">직거래</option>
              <option value="기타">기타</option>
            </select>
            <div className="text-sm text-slate-600 flex items-center">배송 방식</div>
          </div>

          <input className="input" placeholder="우편번호(선택)" value={postal} onChange={(e) => setPostal(e.target.value)} />
          <input className="input" placeholder="주소1(선택)" value={addr1} onChange={(e) => setAddr1(e.target.value)} />
          <input className="input md:col-span-2" placeholder="주소2(선택)" value={addr2} onChange={(e) => setAddr2(e.target.value)} />
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">상품/수량</div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          {(products ?? [])
            .filter((p: any) => !p.deleted_at) // 숨김 컬럼명이 불명확해서 일단 삭제만 제외
            .map((p: any) => {
              const current = lines.find((x) => x.product_id === p.id)?.qty ?? 0;
              const disabled = !!p.is_soldout;

              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {p.name} {p.is_soldout ? <span className="badge ml-2">품절</span> : null}
                    </div>
                    <div className="text-sm text-slate-600">{Number(p.price ?? 0).toLocaleString("ko-KR")}원</div>
                  </div>

                  <input
                    className="input w-[110px]"
                    type="number"
                    min={0}
                    value={current}
                    disabled={disabled}
                    onChange={(e) => setLineQty(p.id, Number(e.target.value))}
                  />
                </div>
              );
            })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btnPrimary" onClick={submit} disabled={submitting}>
            {submitting ? "생성 중..." : "수기 주문 생성"}
          </button>
          <button className="btn" onClick={() => setLines([])} disabled={submitting}>
            수량 초기화
          </button>
        </div>
      </section>
    </main>
  );
}
