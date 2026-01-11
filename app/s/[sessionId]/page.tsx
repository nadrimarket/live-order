"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import AddressField from "@/components/AddressField";
import { ShippingType, Product, Session } from "@/lib/types";

export default function SessionOrderPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  // ✅ "내 주문 찾기" 토큰을 세션별로 localStorage에 저장하기 위한 유틸
  type MyOrderToken = { token: string; createdAt: number; nickname?: string };

  const storageKey = useMemo(() => `liveorder:mytokens:${sessionId}`, [sessionId]);

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

  // ✅ UI에 보여줄 "이 기기에서 만든 내 주문" 목록
  const [myTokens, setMyTokens] = useState<MyOrderToken[]>([]);

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

  // ✅ 주문 성공 후 “한 번 클릭 수정”을 위한 상태
  const [success, setSuccess] = useState<null | { editToken: string }>(null);

  // ✅ 재접속해도 이 기기에서 만든 주문 토큰을 다시 불러오기
  useEffect(() => {
    setMyTokens(loadMyTokens());
  }, [loadMyTokens]);

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
    const priceById = new Map(products.map((p) => [p.id, p.price] as const));
    return Object.entries(qtyById).reduce(
      (sum, [id, q]) => sum + (priceById.get(id) ?? 0) * (q ?? 0),
      0
    );
  }, [qtyById, products]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션이 없어요. {msg}</div>;

  // ✅ 성공 화면: 링크를 “보여주기”가 아니라 버튼으로 “바로 이동”
    const MyOrdersSection = (
    myTokens.length > 0 && (
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">이 기기에서 만든 내 주문</div>
          <button
            className="btn"
            onClick={() => {
              if (!confirm("이 기기에서 저장된 주문 바로가기 목록을 삭제할까요?")) return;
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
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {t.nickname ? `${t.nickname} 주문` : "내 주문"}
                </div>
                <div className="text-xs text-slate-600">
                  {new Date(t.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>

              <div className="flex gap-2">
                <a className="btnPrimary" href={`/order/edit/${t.token}`}>
                  수정하기
                </a>
                <a className="btn" href={`/receipt/token/${t.token}`}>
                  정산서
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          * 이 목록은 이 기기/브라우저에만 저장됩니다. (다른 기기에서는 보이지 않을 수 있어요.)
        </div>
      </section>
    )
  );

  if (success) {
    const editUrl = `/order/edit/${success.editToken}`;
    const receiptUrl = `/receipt/token/${success.editToken}`;

    return (
      <main className="space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="badge">LIVE 주문</div>
            <h1 className="mt-2 text-2xl font-bold">{session.title}</h1>
          </div>
          <a className="btn" href="/">
            처음
          </a>
        </header>

        {MyOrdersSection} 

        <section className="card p-4 md:p-6 space-y-3">
          <div className="text-lg font-bold">✅ 주문이 접수되었습니다!</div>
          <div className="text-sm text-slate-600">
            결제는 별도로 진행됩니다. 아래 버튼으로 주문 내용을 바로 수정할 수 있어요.
          </div>

          <button className="btnPrimary w-full" onClick={() => (window.location.href = editUrl)}>
            주문 수정하기
          </button>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <button
              className="btn w-full"
              onClick={() => (window.location.href = receiptUrl)}
              title="정산서 화면으로 이동"
            >
              정산서 보기(JPG)
            </button>

            <button
              className="btn w-full"
              onClick={async () => {
                const full = `${location.origin}${editUrl}`;
                await navigator.clipboard.writeText(full);
                setMsg("수정 링크를 클립보드에 복사했어요.");
              }}
            >
              수정 링크 복사
            </button>
          </div>

          {msg && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">
              {msg}
            </div>
          )}

          <button
            className="btn w-full"
            onClick={() => {
              // 새 주문을 받기 위해 초기화
              setSuccess(null);
              setMsg("");
              setQtyById({});
              setNickname("");
              setPhone("");
              setPostal("");
              setAddr1("");
              setAddr2("");
              setShipping("일반");
            }}
          >
            새로 주문하기
          </button>
        </section>

        {MyOrdersSection}
        
      </main>
    );
  }

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
        <a className="btn" href="/">
          처음
        </a>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold">닉네임</label>
            <input
              className="input mt-1"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">연락처</label>
            <input
              className="input mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">배송</label>
            <select
              className="input mt-1"
              value={shipping}
              onChange={(e) => setShipping(e.target.value as ShippingType)}
            >
              <option value="일반">일반</option>
              <option value="제주/도서">제주/도서</option>
              <option value="픽업">픽업</option>
            </select>
          </div>
        </div>

        {/* ✅ 주소 입력을 실제 주소검색 연동으로 교체 */}
        <AddressField
          shipping={shipping}
          postal={postal}
          addr1={addr1}
          addr2={addr2}
          onChange={(next) => {
            setPostal(next.postal);
            setAddr1(next.addr1);
            setAddr2(next.addr2);
          }}
        />

        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <div className="text-sm font-semibold">현재 합계</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{total.toLocaleString("ko-KR")}원</div>
          </div>
          <div className="small">주문 제출 후 “주문 수정하기” 버튼이 생성됩니다.</div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">오늘 판매 물품</h2>
          <span className="badge">{products.filter((p) => p.is_active).length}개</span>
        </div>
        <ProductGrid
          products={products.filter((p) => p.is_active)}
          qtyById={qtyById}
          setQty={(id, qty) => setQtyById((prev) => ({ ...prev, [id]: qty }))}
        />
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">주문 제출</div>
          <div className="text-sm text-slate-600 tabular-nums">합계 {total.toLocaleString("ko-KR")}원</div>
        </div>

        {msg && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">
            {msg}
          </div>
        )}

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

              // ✅ 성공 화면으로 전환 (여기서 “한 번 클릭 수정” 구현)
              setSuccess({ editToken: json.editToken });
              
              saveMyToken({ token: json.editToken, createdAt: Date.now(), nickname: nn });
              setMyTokens(loadMyTokens());

              // 기존 입력값은 성공 화면에서 '새로 주문하기' 눌렀을 때 초기화하도록 둠
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
