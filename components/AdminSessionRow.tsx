"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  title: string;
  is_closed: boolean;
  created_at: string;
  is_deleted?: boolean;
};

export default function AdminSessionRow({ s }: { s: Row }) {
  const router = useRouter();
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/admin/session/order-count?sessionId=${encodeURIComponent(s.id)}`);
      const j = await res.json();
      if (!alive) return;
      if (res.ok && j.ok) setOrderCount(j.count ?? 0);
      else setOrderCount(null);
    })();
    return () => { alive = false; };
  }, [s.id]);

  const deleted = !!s.is_deleted;

  async function doDelete() {
    const n = orderCount ?? 0;
    const ok = confirm(
      n > 0
        ? `⚠️ 이 세션에는 주문이 ${n}건 있습니다.\n\n세션을 삭제(숨김)해도 주문 데이터는 남아있습니다.\n정말 삭제할까요?`
        : "정말 이 세션을 삭제할까요?\n(세션은 목록에서 숨김 처리됩니다.)"
    );
    if (!ok) return;

    const res = await fetch("/api/admin/session/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: s.id }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error ?? "삭제 실패");
    router.refresh();
  }

  async function doRestore() {
    const ok = confirm("이 세션을 복구할까요? (목록에 다시 표시됩니다)");
    if (!ok) return;

    const res = await fetch("/api/admin/session/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: s.id }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error ?? "복구 실패");
    router.refresh();
  }

  return (
    <div className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 ${deleted ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="truncate font-semibold">
          {s.title} {deleted && <span className="text-xs text-slate-500">(삭제됨)</span>}
        </div>
        <div className="text-xs text-slate-600 flex gap-2 items-center">
          <span>{new Date(s.created_at).toLocaleString("ko-KR")}</span>
          {typeof orderCount === "number" && <span className="badge">주문 {orderCount}건</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {s.is_closed ? <span className="badge">마감</span> : <span className="badge">LIVE</span>}
        <a className="btn" href={`/admin/session/${s.id}`}>관리</a>
        <a className="btn" href={`/admin/s/${s.id}/products`}>물품</a>
        <a className="btnPrimary" href={`/admin/session/${s.id}/summary`}>판매현황</a>

        {!deleted ? (
          <button className="btn" onClick={doDelete}>삭제</button>
        ) : (
          <button className="btn" onClick={doRestore}>복구</button>
        )}
      </div>
    </div>
  );
}
