"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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
  image_url?: string | null;
  is_soldout?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | null;
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

function formatDT(v?: string | null) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString("ko-KR");
  } catch {
    return String(v);
  }
}

function money(n: number) {
  return (Number(n) || 0).toLocaleString("ko-KR");
}

function compactAddr(o: AdminOrder) {
  const a = [o.postal_code, o.address1, o.address2].filter(Boolean).join(" ");
  return a || "-";
}

export default function AdminSessionPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  // ===== Admin PIN (localStorage 저장) =====
  const [adminPin, setAdminPin] = useState("");
  const pinStorageKey = "liveorder:adminPin";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(pinStorageKey) || "";
      if (saved) setAdminPin(saved);
    } catch {}
  }, []);

  const saveAdminPin = useCallback(() => {
    try {
      localStorage.setItem(pinStorageKey, adminPin.trim());
      alert("관리자 PIN 저장 완료");
    } catch {
      alert("저장 실패");
    }
  }, [adminPin]);

  // ===== Fetch helper (x-admin-pin 자동 첨부) =====
  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      if (!headers.get("Content-Type") && init?.method && init.method !== "GET") {
        headers.set("Content-Type", "application/json");
      }
      headers.set("x-admin-pin", adminPin.trim());

      const res = await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    },
    [adminPin]
  );

  // ===== Page state =====
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [toast, setToast] = useState("");

  // ===== Filters =====
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyUnshipped, setOnlyUnshipped] = useState(false);
  const [hideDeleted, setHideDeleted] = useState(true);
  const [q, setQ] = useState("");

  // ===== Load session data =====
  const load = useCallback(async () => {
    setLoaded(false);
    setErr("");
    setToast("");

    try {
      if (!adminPin.trim()) throw new Error("관리자 PIN을 입력하세요.");

      // ✅ 여기 URL이 너 프로젝트와 다르면 이 줄만 바꾸면 됨
      const { res, json } = await adminFetch(`/api/admin/session/${sessionId}`, { method: "GET" });

      if (!res.ok) throw new Error(json?.error ?? "세션 데이터를 불러오지 못했어요.");

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
    // PIN이 저장되어 있으면 자동 로딩 시도
    if (adminPin.trim()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPin, sessionId]);

  // ===== Session code (짧은 코드) =====
  const sessionCode = session?.code ?? null;

  const ensureCode = useCallback(async () => {
    setToast("");
    try {
      if (!adminPin.trim()) throw new Error("관리자 PIN을 입력하세요.");

      const { res, json } = await adminFetch("/api/admin/session/code/ensure", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) throw new Error(json?.error ?? "코드 생성 실패");

      // 세션 재로딩 대신 부분 업데이트
      setSession((prev) => (prev ? { ...prev, code: String(json.code) } : prev));
      setToast("✅ 코드가 생성되었습니다.");
    } catch (e: any) {
      setToast(`❗ ${e?.message ?? "실패"}`);
    }
  }, [adminFetch, adminPin, sessionId]);

  const copyCustomerLink = useCallback(async () => {
    try {
      if (!sessionCode) return;
      const url = `${location.origin}/s/${sessionCode}`;
      await navigator.clipboard.writeText(url);
      setToast("✅ 고객 링크를 복사했어요.");
    } catch {
      setToast("❗ 복사 실패");
    }
  }, [sessionCode]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => !o.deleted_at);
    const unpaid = activeOrders.filter((o) => !o.paid_at).length;
    const unshipped = activeOrders.filter((o) => !o.shipped_at).length;
    const totalAmount = activeOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    return { unpaid, unshipped, totalAmount, activeCount: activeOrders.length, allCount: orders.length };
  }, [orders]);

  // ===== Filtered orders =====
  const filteredOrders = useMemo(() => {
    let arr = [...orders];

    if (hideDeleted) arr = arr.filter((o) => !o.deleted_at);
    if (onlyUnpaid) arr = arr.filter((o) => !o.paid_at);
    if (onlyUnshipped) arr = arr.filter((o) => !o.shipped_at);

    const keyword = q.trim().toLowerCase();
    if (keyword) {
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
        return hay.includes(keyword);
      });
    }

    // 최신순
    arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return arr;
  }, [orders, hideDeleted, onlyUnpaid, onlyUnshipped, q]);

  // ===== Order actions =====
  const togglePaid = useCallback(
    async (orderId: string) => {
      setToast("");
      try {
        const { res, json } = await adminFetch("/api/admin/orders/paid", {
          method: "POST",
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) throw new Error(json?.error ?? "입금 처리 실패");
        await load();
        setToast("✅ 입금 상태가 변경되었습니다.");
      } catch (e: any) {
        setToast(`❗ ${e?.message ?? "실패"}`);
      }
    },
    [adminFetch, load]
  );

  const toggleShipped = useCallback(
    async (orderId: string) => {
      setToast("");
      try {
        const { res, json } = await adminFetch("/api/admin/orders/shipped", {
          method: "POST",
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) throw new Error(json?.error ?? "발송 처리 실패");
        await load();
        setToast("✅ 발송 상태가 변경되었습니다.");
      } catch (e: any) {
        setToast(`❗ ${e?.message ?? "실패"}`);
      }
    },
    [adminFetch, load]
  );

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

  // ===== UI =====
  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="badge">ADMIN · 세션 관리</div>
          <h1 className="text-2xl font-bold">{session?.title ?? "세션"}</h1>
          <div className="text-sm text-slate-600">
            세션ID: <span className="font-mono">{sessionId}</span>
            {session?.created_at ? <span className="ml-2">· 생성 {formatDT(session.created_at)}</span> : null}
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

      {/* 관리자 PIN */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="text-sm font-semibold">관리자 PIN</label>
            <input
              className="input mt-1"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="관리자 PIN"
            />
            <div className="mt-1 text-xs text-slate-500">
              * PIN은 이 브라우저에 저장됩니다. (localStorage)
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={saveAdminPin}>
              PIN 저장
            </button>
            <button className="btnPrimary" onClick={load} disabled={!adminPin.trim()}>
              불러오기
            </button>
          </div>
        </div>

        {toast ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">{toast}</div> : null}
        {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div> : null}
      </section>

      {/* 고객 공유 링크 (코드) */}
      <section className="card p-4 md:p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">고객 공유 링크</div>
          <div className="flex gap-2">
            {!sessionCode ? (
              <button className="btnPrimary" onClick={ensureCode} disabled={!adminPin.trim()}>
                코드 생성
              </button>
            ) : (
              <button className="btnPrimary" onClick={copyCustomerLink}>
                링크 복사
              </button>
            )}
          </div>
        </div>

        {sessionCode ? (
          <div className="text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">CODE</span>
              <span className="font-mono font-semibold">{sessionCode}</span>
              <span className="text-slate-500">
                {typeof window !== "undefined" ? `${location.origin}/s/${sessionCode}` : `/s/${sessionCode}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">아직 코드가 없습니다. “코드 생성”을 누르면 고객용 짧은 링크를 만들어요.</div>
        )}
      </section>

      {/* 요약 */}
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

      {/* 주문 필터 */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">주문 관리</div>
          <div className="text-sm text-slate-600">
            표시 {filteredOrders.length}건 / 전체 {orders.length}건
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
          <div className="md:col-span-5">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색(닉네임/전화/주소/메모/ID)" />
          </div>

          <div className="md:col-span-7 flex flex-wrap items-center gap-2">
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

        {/* 주문 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="w-[140px] p-3">시간</th>
                <th className="w-[160px] p-3">고객</th>
                <th className="w-[340px] p-3">주소</th>
                <th className="w-[120px] p-3">수량</th>
                <th className="w-[140px] p-3">금액</th>
                <th className="w-[220px] p-3">상태</th>
                <th className="w-[220px] p-3">작업</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredOrders.map((o) => (
                <tr key={o.id} className={o.deleted_at ? "opacity-50" : ""}>
                  <td className="p-3 align-top">
                    <div className="text-xs text-slate-600">{formatDT(o.created_at)}</div>
                    <div className="mt-1 text-xs text-slate-500 font-mono truncate">{o.id}</div>
                    {o.is_manual ? <div className="mt-1 badge">수기</div> : null}
                  </td>

                  <td className="p-3 align-top">
                    <div className="font-semibold truncate">{o.nickname}</div>
                    <div className="text-xs text-slate-600 truncate">{o.phone ?? "-"}</div>
                    {o.shipping ? <div className="mt-1 text-xs text-slate-500">배송: {o.shipping}</div> : null}
                  </td>

                  <td className="p-3 align-top">
                    <div className="text-xs text-slate-700 break-words">{compactAddr(o)}</div>
                    {o.admin_note ? (
                      <div className="mt-2 text-xs text-slate-600 break-words">
                        <span className="text-slate-400">메모:</span> {o.admin_note}
                      </div>
                    ) : null}
                  </td>

                  <td className="p-3 align-top tabular-nums">{Number(o.total_qty) || 0}</td>
                  <td className="p-3 align-top tabular-nums font-semibold">{money(Number(o.total_amount) || 0)}원</td>

                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-1 text-xs">
                      <div>
                        입금:{" "}
                        {o.paid_at ? (
                          <span className="text-emerald-700 font-semibold">완료</span>
                        ) : (
                          <span className="text-slate-500">미입금</span>
                        )}
                      </div>
                      <div>
                        발송:{" "}
                        {o.shipped_at ? (
                          <span className="text-emerald-700 font-semibold">완료</span>
                        ) : (
                          <span className="text-slate-500">미발송</span>
                        )}
                      </div>
                      {o.deleted_at ? <div className="text-rose-700 font-semibold">삭제됨</div> : null}
                    </div>
                  </td>

                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn" onClick={() => togglePaid(o.id)} disabled={!!o.deleted_at}>
                        입금 토글
                      </button>
                      <button className="btn" onClick={() => toggleShipped(o.id)} disabled={!!o.deleted_at}>
                        발송 토글
                      </button>
                      <button className="btnDanger" onClick={() => deleteOrder(o.id)}>
                        삭제
                      </button>
                      <Link className="btn" href={`/receipt/order/${o.id}`}>
                        정산서
                      </Link>
                    </div>
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

        <div className="text-xs text-slate-500">
          * 입금/발송 토글 API 경로가 너 프로젝트와 다르면{" "}
          <span className="font-mono">/api/admin/orders/paid</span>,{" "}
          <span className="font-mono">/api/admin/orders/shipped</span> 부분만 실제 경로로 바꾸면 됩니다.
        </div>
      </section>

      {/* 상품 영역 (리스트만) */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">상품</div>
          <div className="text-sm text-slate-600">총 {products.length}개</div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {products.m
