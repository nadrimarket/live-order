"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import AddressField from "@/components/AddressField";
import { ShippingType, Product, Session } from "@/lib/types";

export default function SessionOrderPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params; // ✅ UUID

  /* =========================
   * 내 주문 토큰(localStorage)
   * ========================= */
  type MyOrderToken = { token: string; createdAt: number; nickname?: string };
  const storageKey = `liveorder:mytokens:${sessionId}`;

  const loadMyTokens = useCallback((): MyOrderToken[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x) => x && typeof x.token === "string")
        .map((x) => ({
          token: String(x.token),
          createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
          nickname: typeof x.nickname === "string" ? x.nickname : undefined,
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }, [storageKey]);

  const saveMyToken = useCallback(
    (t: MyOrderToken) => {
      try {
        const prev = loadMyTokens();
        const next = [t, ...prev.filter((p) => p.token !== t.token)].slice(0, 20);
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [loadMyTokens, storageKey]
  );

  const [myTokens, setMyTokens] = useState<MyOrderToken[]>([]);

  /* =========================
   * 데이터 상태
   * ========================= */
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState("");

  /* =========================
   * 입력 상태
   * ========================= */
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [postal, setPostal] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [shipping, setShipping] = useState<ShippingType>("일반");
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState<null | { editToken: string }>(null);

  /* =========================
   * 내 주문 토큰 로드
   * ========================= */
  useEffect(() => {
    setMyTokens(loadMyTokens());
  }, [loadMyTokens]);

  /* =========================
   * 세션 + 상품 로드 (Supabase)
   * ========================= */
  useEffect(() => {
    (async () => {
      setLoaded(false);
      setMsg("");

      try {
        const res = await fetch(`/api/session/${sessionId}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "세션을 불러오지 못했어요.");

        setSession(json.session);
        setProducts(json.products ?? []);
      } catch (e: any) {
        setMsg(e?.message ?? "불러오기 실패");
        setSession(null);
        setProducts([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, [sessionId]);

  /* =========================
   * 합계 계산
   * ========================= */
  const total = useMemo(() => {
    const priceById = new Map(products.map((p) => [p.id, p.price] as const));
    return Object.entries(qtyById).reduce(
      (sum, [id, q]) => sum + (priceById.get(id) ?? 0) * (q ?? 0),
      0
    );
  }, [qtyById, products]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션이 없어요. {msg}</div>;

  /* =========================
   * 내 주문 섹션
   * ========================= */
  const MyOrdersSection =
    myTokens.length > 0 ? (
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">이 기기에서 만든 내 주문</div>
          <button
            className="btn"
            onClick={() => {
              if (!confirm("이 기기에서 저장된 주문 목록을 삭제할까요?")) return;
              localStorage.removeItem(storageKey);
              setMyTokens([]);
            }}
          >
            목록 지우기
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {myTokens.map((t) => (
            <div
              key={t.token}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
            >
              <div>
                <div className="font-semibold">{t.nickname ?? "내 주문"}</div>
                <div className="text-xs text-slate-500">
                  {new Date(t.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>
              <div className="flex gap-2">
                <a className="btnPrimary" href={`/order/edit/${t.token}`}>
                  수정
                </a>
                <a className="btn" href={`/receipt/token/${t.token}`}>
                  정산서
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null;

  /* =========================
   * 성공 화면
   * ========================= */
  if (success) {
    return (
      <main className="space-y-5">
        <header className="flex justify-between">
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <a className="btn" href="/">
            처음
          </a>
        </header>

        {MyOrdersSection}

        <section className="card p-6 space-y-3">
          <div className="text-lg font-bold">✅ 주문이 접수되었습니다!</div>
          <a className="btnPrimary w-full" href={`/order/edit/${success.editToken}`}>
            주문 수정하기
          </a>
          <a className="btn w-full" href={`/receipt/token/${success.editToken}`}>
            정산서 보기
          </a>
          <button
            className="btn w-full"
            onClick={() => {
              setSuccess(null);
              setQtyById({});
              setNickname("");
              setPhone("");
              setPostal("");
              setAddr1("");
              setAddr2("");
              setShipping("일반");
            }}
          >
            새 주문하기
          </button>
        </section>

        {MyOrdersSection}
      </main>
    );
  }

  /* =========================
   * 주문 화면
   * ========================= */
  return (
    <main className="space-y-5">
      <header className="flex justify-between">
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <a className="btn" href="/">
          처음
        </a>
      </header>

      {MyOrdersSection}

      <section className="card p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input className="input" placeholder="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select className="input" value={shipping} onChange={(e) => setShipping(e.target.value as ShippingType)}>
            <option value="일반">일반</option>
            <option value="제주/도서">제주/도서</option>
            <option value="픽업">픽업</option>
          </select>
        </div>

        <AddressField
          shipping={shipping}
          postal={postal}
          addr1={addr1}
          addr2={addr2}
          onChange={(n) => {
            setPostal(n.postal);
            setAddr1(n.addr1);
            setAddr2(n.addr2);
          }}
        />

        <div className="text-xl font-bold">{total.toLocaleString("ko-KR")}원</div>
      </section>

      <section>
        <h2 className="font-bold mb-2">오늘 판매 물품</h2>
        <ProductGrid
        <ProductGrid
          products={products.filter((p: any) => !p.is_soldout)}
          qtyById={qtyById}
          setQty={(id, qty) => setQtyById((prev) => ({ ...prev, [id]: qty }))}
        />
      </section>

      <section className="card p-4 space-y-3">
        {msg && <div className="text-sm text-red-600">{msg}</div>}

        <button
          className="btnPrimary w-full"
          disabled={session.is_closed}
          onClick={async () => {
            try {
              if (!nickname.trim()) throw new Error("닉네임을 입력하세요.");
              if (!phone.trim()) throw new Error("연락처를 입력하세요.");
              if (shipping !== "픽업" && !addr1.trim()) throw new Error("주소를 입력하세요.");

              const lines = Object.entries(qtyById)
                .map(([product_id, qty]) => ({ product_id, qty }))
                .filter((l) => l.qty > 0);

              if (lines.length === 0) throw new Error("수량을 1개 이상 담아주세요.");

              const res = await fetch("/api/order/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId,
                  nickname,
                  phone,
                  shipping,
                  postal_code: postal,
                  address1: addr1,
                  address2: addr2,
                  lines,
                }),
              });

              const json = await res.json();
              if (!res.ok) throw new Error(json?.error ?? "주문 실패");

              setSuccess({ editToken: json.editToken });
              saveMyToken({ token: json.editToken, createdAt: Date.now(), nickname });
              setMyTokens(loadMyTokens());
            } catch (e: any) {
              setMsg(e?.message ?? "오류 발생");
            }
          }}
        >
          주문 제출하기
        </button>
      </section>
    </main>
  );
}
