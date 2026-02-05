"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Session = {
  id: string;
  title: string;
  is_closed: boolean;
  code?: string | null;
  created_at?: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  is_soldout?: boolean | null;
  is_active?: boolean | null;
};

type AdminOrder = {
  id: string;
  nickname: string;
  phone?: string | null;

  postal_code?: string | null;
  address1?: string | null;
  address2?: string | null;

  shipping?: string | null;

  admin_note?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  deleted_at?: string | null;
  is_manual?: boolean | null;

  total_qty: number;
  total_amount: number;
  created_at?: string | null;
};

function fmtDT(v?: string | null) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString("ko-KR");
  } catch {
    return String(v);
  }
}

function money(n: any) {
  return (Number(n) || 0).toLocaleString("ko-KR");
}

function addr(o: AdminOrder) {
  const s = [o.postal_code, o.address1, o.address2].filter(Boolean).join(" ");
  return s || "-";
}

export default function AdminSessionPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  // ===== PIN =====
  const PIN_KEY = "liveorder:adminPin";
  const [adminPin, setAdminPin] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PIN_KEY) || "";
      if (saved) setAdminPin(saved);
    } catch {}
  }, []);

  const savePin = useCallback(() => {
    try {
      localStorage.setItem(PIN_KEY, adminPin.trim());
      alert("PIN 저장 완료");
    } catch {
      alert("PIN 저장 실패");
    }
  }, [adminPin]);

  // ===== state =====
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  // ===== filters =====
  const [q, setQ] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyUnshipped, setOnlyUnshipped] = useState(false);
  const [hideDeleted, setHideDeleted] = useState(true);

  // ===== helper fetch (pin header) =====
  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      headers.set("x-admin-pin", adminPin.trim());

      // JSON body면 content-type 추가
      if (init?.body && !headers.get("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const res = await fetch(url, { ...init, headers, cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    },
    [adminPin]
  );

  // ===== load =====
  const load = useCallback(async () => {
    setLoaded(false);
    setErr("");
    setToast("");

    try {
      if (!adminPin.trim()) throw new Error("관리자 PIN을 입력하세요.");

      // ✅ 너 프로젝트의 실제 로딩 API가 다르면 여기 URL만 바꾸면 됨
      const { res, json } = await adminFetch(`/api/admin/session/${sessionId}`, { method: "GET" });

      if (!res.ok) throw new Error(json?.error ?? "불러오기 실패");

      setSession(json.session ?? null);
      setProducts(Array.isArray(json.products) ? json.products : []);
      setOrders(Array.isArray(json.orders) ? json.orders : []);
    } catch (e: any) {
      setSession(null);
      setProducts([]);
      setOrders([]);
      setErr(e?.message ?? "불러오기 실패");
    } finally {
      setLoaded(true);
    }
  }, [adminFetch, adminPin, sessionId]);

  useEffect(() => {
    if (adminPin.trim()) load();
  }, [adminPin, load]);

  // ===== session code =====
  const code = session?.code ?? null;

  const ensureCode = useCallback(async () => {
    setToast("");
    try {
      if (!adminPin.trim()) throw new Error("관리자 PIN을 입력하세요.");

      const { res, json } = await adminFetch("/api/admin/session/code/ensure", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) throw new Error(json?.error ?? "코드 생성 실패");

      const newCode = String(json.code ?? "");
      if (!newCode) throw new Error("코드 생성 응답이 비어있어요.");

      setSession((prev) => (prev ? { ...prev, code: newCode } : prev));
      setToast("✅ 코드가 생성되었습니다.");
    } catch (e: any) {
      setToast(`❗ ${e?.message ?? "실패"}`);
    }
  }, [adminFetch, adminPin, sessionId]);

  const copyLink = useCallback(async () => {
    try {
      if (!code) return;
      const url = `${location.origin}/s/${code}`;
      await navigator.clipboard.writeText(url);
      setToast("✅ 고객 링크를 복사했어요.");
    } catch {
      setToast("❗ 복사 실패");
    }
  }, [code]);

  // ===== stats =====
  const stats = useMemo(() => {
    const active = orders.filter((o) => !o.deleted_at);
    const totalAmount = active.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const unpaid = active.filter((o) => !o.paid_at).length;
    const unshipped = active.filter((o) => !o.shipped_at).length;
    return { activeCount: active.length, totalAmount, unpaid, unshipped, allCount: orders.length };
  }, [orders]);

  // ===== filtered orders =====
  const filteredOrders = useMemo(() => {
    let arr = [...orders];
    if (hideDeleted) arr = arr.filter((o) => !o.deleted_at);
    if (onlyUnpaid) arr = arr.filter((o) => !o.paid_at);
    if (onlyUnshipped) arr = arr.filter((o) => !o.shipped_at);

    const kw = q.trim().toLowerCase();
    if (kw) {
      arr = arr.filter((o) => {
        const hay = [
          o.nickname,
          o.phone,
          o.shipping,
          o.postal_code,
          o.address1,
          o.address2,
          o.admin_note,
          o.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(kw);
      });
    }

    arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return arr;
  }, [orders, hideDeleted, onlyUnpaid, onlyUnshipped, q]);

  // ===== delete (너가 이미 가진 API) =====
  const deleteOrder = useCallback(
    async (orderId: string) => {
      if (!confirm("이 주문을 삭제(숨김)할까요?")) return;
      setToast("");
      try {
        const { res, json } = await adminFetch("/api/admin/orders/delete", {
          method: "POST",
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) throw new Error(json?.error ?? "삭제 실패");
        await load();
        setToast("✅ 주문이 삭제 처리되었습니다.");
      } catch (e: any) {
        setToast(`❗ ${e?.message ?? "실패"}`);
      }
    },
    [adminFetch, load]
  );

  // ===== render =====
  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="badge">ADMIN · 세션 관리</div>
          <h1 className="text-2xl font-bold">{session?.title ?? "세션"}</h1>
          <div className="text-sm text-slate-600">
            세션ID: <span className="font-mono">{sessionId}</span>
            {session?.created_at ? <span className="ml-2">· 생성 {fmtDT(session.created_at)}</span> : null}
          </div>
          {session?.is_closed ? (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
              이 세션은 <b>마감</b> 상태입니다.
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className="btn" href="/admin">
            관리자 홈
          </Link>
          <Link className="btn" href={`/admin/session/${sessionId}/manual`}>
            수기주문
          </Link>
          <button className="btnPrimary" onClick={load} disabled={!adminPin.trim()}>
            새로고침
          </button>
        </div>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">관리자 PIN</label>
            <input
              className="input mt-1"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="관리자 PIN"
            />
            <div className="mt-1 text-xs text-slate-500">* PIN은 이 브라우저(localStorage)에 저장됩니다.</div>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn w-full" onClick={savePin}>
              PIN 저장
            </button>
            <button className="btnPrimary w-full" onClick={load} disabled={!adminPin.trim()}>
              불러오기
            </button>
          </div>
        </div>

        {toast ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">{toast}</div>
        ) : null}
        {err ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div>
        ) : null}
      </section>

      <section className="card p-4 md:p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">고객 공유 링크</div>
          <div className="flex gap-2">
            {!code ? (
              <button className="btnPrimary" onClick={ensureCode} disabled={!adminPin.trim()}>
                코드 생성
              </button>
            ) : (
              <button className="btnPrimary" onClick={copyLink}>
                링크 복사
              </button>
            )}
          </div>
        </div>

        {code ? (
          <div className="text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">CODE</span>
              <span className="font-mono font-semibold">{code}</span>
              <span className="text-slate-500">{typeof window !== "undefined" ? `${location.origin}/s/${code}` : `/s/${code}`}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">아직 코드가 없습니다. “코드 생성”을 누르면 고객용 짧은 링크를 만들어요.</div>
        )}
      </section>

      <section className="card p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">주문(삭제 제외)</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{stats.activeCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">미입금</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{stats.unpaid}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">미발송</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{stats.unshipped}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">총 판매금액</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{money(stats.totalAmount)}원</div>
          </div>
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">주문</div>
          <div className="text-sm text-slate-600">
            표시 {filteredOrders.length} / 전체 {orders.length}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
          <div className="md:col-span-5">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색(닉네임/전화/주소/메모/ID)" />
          </div>
          <div className="md:col-span-7 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyUnpaid} onChange={(e) => setOnlyUnpaid(e.target.checked)} />
              미입금만
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyUnshipped} onChange={(e) => setOnlyUnshipped(e.target.checked)} />
              미발송만
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hideDeleted} onChange={(e) => setHideDeleted(e.target.checked)} />
              삭제 제외
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="w-[140px] p-3">시간</th>
                <th className="w-[160px] p-3">고객</th>
                <th className="w-[360px] p-3">주소</th>
                <th className="w-[100px] p-3">수량</th>
                <th className="w-[130px] p-3">금액</th>
                <th className="w-[120px] p-3">상태</th>
                <th className="w-[120px] p-3">작업</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredOrders.map((o) => (
                <tr key={o.id} className={o.deleted_at ? "opacity-50" : ""}>
                  <td className="p-3 align-top">
                    <div className="text-xs text-slate-600">{fmtDT(o.created_at)}</div>
                    <div className="mt-1 text-xs text-slate-500 font-mono truncate">{o.id}</div>
                    {o.is_manual ? <div className="mt-1 badge">수기</div> : null}
                  </td>

                  <td className="p-3 align-top">
                    <div className="font-semibold truncate">{o.nickname}</div>
                    <div className="text-xs text-slate-600 truncate">{o.phone ?? "-"}</div>
                    {o.shipping ? <div className="mt-1 text-xs text-slate-500">배송: {o.shipping}</div> : null}
                  </td>

                  <td className="p-3 align-top">
                    <div className="text-xs text-slate-700 break-words">{addr(o)}</div>
                    {o.admin_note ? (
                      <div className="mt-2 text-xs text-slate-600 break-words">
                        <span className="text-slate-400">메모:</span> {o.admin_note}
                      </div>
                    ) : null}
                  </td>

                  <td className="p-3 align-top tabular-nums">{Number(o.total_qty) || 0}</td>
                  <td className="p-3 align-top tabular-nums font-semibold">{money(o.total_amount)}원</td>

                  <td className="p-3 align-top text-xs">
                    <div>입금: {o.paid_at ? <b className="text-emerald-700">완료</b> : <span className="text-slate-500">미입금</span>}</div>
                    <div>발송: {o.shipped_at ? <b className="text-emerald-700">완료</b> : <span className="text-slate-500">미발송</span>}</div>
                    {o.deleted_at ? <div className="text-rose-700 font-semibold">삭제됨</div> : null}
                  </td>

                  <td className="p-3 align-top">
                    <button className="btnDanger w-full" onClick={() => deleteOrder(o.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-500" colSpan={7}>
                    표시할 주문이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">상품</div>
          <div className="text-sm text-slate-600">총 {products.length}개</div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-sm text-slate-600 tabular-nums">{money(p.price)}원</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {p.is_soldout ? <span className="badge">품절</span> : <span className="badge">판매중</span>}
                  {p.is_active === false ? <span className="badge">비활성</span> : null}
                </div>
              </div>
              <Link className="btn" href={`/admin/session/${sessionId}/manual`}>
                수기
              </Link>
            </div>
          ))}
          {products.length === 0 ? <div className="text-sm text-slate-500">등록된 상품이 없습니다.</div> : null}
        </div>
      </section>

      <footer className="pb-10 text-xs text-slate-500">{loaded ? "" : "불러오는 중..."}</footer>
    </main>
  );
}
