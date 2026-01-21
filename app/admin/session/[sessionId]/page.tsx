"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, Session } from "@/lib/types";

type OrderRow = {
  id: string;
  nickname: string;
  phone?: string | null;
  postal_code?: string | null;
  address1?: string | null;
  address2?: string | null;
  shipping: string;
  edit_token: string;
  paid_at?: string | null;
  shipped_at?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
};

export default function AdminSession({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [notice, setNotice] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ 상품 추가(이미지 없어도 가능)
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ✅ 상품 수정(인라인)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editSort, setEditSort] = useState(1);
  const [editImageUrl, setEditImageUrl] = useState<string>("");

  // ✅ 주문 필터
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyUnshipped, setOnlyUnshipped] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const newPreview = useMemo(() => (newFile ? URL.createObjectURL(newFile) : null), [newFile]);

  function formatAddress(o: OrderRow) {
    return (
      (o.postal_code ? `[${o.postal_code}] ` : "") +
      (o.address1 ?? "") +
      (o.address2 ? " " + o.address2 : "")
    ).trim();
  }

  async function reload() {
    setMsg("");

    // 세션/상품/공지
    const res = await fetch(`/api/admin/session/${sessionId}`, { cache: "no-store" });
    const j = await res.json();
    if (!res.ok) {
      setMsg(j?.error ?? "불러오기 실패");
      setLoaded(true);
      return;
    }
    setSession(j.session);
    setProducts(j.products ?? []);
    setNotice(j.notice ?? "");

    // 주문
    const r2 = await fetch(
      `/api/admin/orders?sessionId=${encodeURIComponent(sessionId)}&includeDeleted=${includeDeleted ? "1" : "0"}`,
      { cache: "no-store" }
    );
    const j2 = await r2.json();
    if (r2.ok && j2.ok) setOrders(j2.orders ?? []);
    else setOrders([]);

    setLoaded(true);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // includeDeleted 변경 시 주문 목록 다시 로드(서버에서 deleted 포함 여부 반영)
  useEffect(() => {
    if (!loaded) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션 없음. {msg}</div>;

  const isDeleted = !!(session as any)?.is_deleted;

  const onToggleDeleteRestore = async () => {
    const r = await fetch(`/api/admin/session/order-count?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });
    const j = await r.json();
    const orderCount = r.ok && j.ok ? (j.count ?? 0) : 0;

    if (!isDeleted) {
      const ok = confirm(
        orderCount > 0
          ? `⚠️ 이 세션에는 주문이 ${orderCount}건 있습니다.\n\n세션을 삭제(숨김)해도 주문 데이터는 남아있습니다.\n정말 삭제할까요?`
          : "정말 이 세션을 삭제할까요?\n(세션은 목록에서 숨김 처리됩니다.)"
      );
      if (!ok) return;

      const res = await fetch("/api/admin/session/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const jj = await res.json();
      if (!res.ok || !jj.ok) return alert(jj?.error ?? "삭제 실패");

      alert("세션이 삭제되었습니다.");
      await reload();
      return;
    }

    const ok2 = confirm("이 세션을 복구할까요? (목록에 다시 표시됩니다)");
    if (!ok2) return;

    const res2 = await fetch("/api/admin/session/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const jj2 = await res2.json();
    if (!res2.ok || !jj2.ok) return alert(jj2?.error ?? "복구 실패");

    alert("세션이 복구되었습니다.");
    await reload();
  };

  const visibleOrders = (orders ?? []).filter((o) => {
    if (!includeDeleted && o.deleted_at) return false;
    if (onlyUnpaid && o.paid_at) return false;
    if (onlyUnshipped && o.shipped_at) return false;
    return true;
  });

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">{session.title}</h1>
          <div className="mt-1 text-sm text-slate-600">
            세션ID: <span className="font-mono">{(session as any).id}</span>
          </div>
          {isDeleted && (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
              이 세션은 삭제(숨김) 상태입니다. 고객에게 노출되지 않습니다.
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <a className="btn" href={`/s/${sessionId}`}>
            고객 페이지
          </a>
          <a className="btn" href="/admin">
            세션 목록
          </a>
          <a className="btnPrimary" href={`/admin/session/${sessionId}/summary`}>
            판매현황
          </a>

          <button className="btn" onClick={onToggleDeleteRestore}>
            {isDeleted ? "세션 복구" : "세션 삭제"}
          </button>
        </div>
      </header>

      {msg && <div className="card p-4 text-sm whitespace-pre-wrap">{msg}</div>}

      {/* 방송
