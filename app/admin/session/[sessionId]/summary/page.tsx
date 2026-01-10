\
"use client";

import { useEffect, useMemo, useState } from "react";

export default function Summary({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [rows, setRows] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/summary?sessionId=${encodeURIComponent(sessionId)}`);
      const j = await res.json();
      if (!res.ok) { setMsg(j?.error ?? "불러오기 실패"); setLoaded(true); return; }
      setRows(j.rows ?? []);
      setLoaded(true);
    })();
  }, [sessionId]);

  const totals = useMemo(() => {
    const soldQty = rows.reduce((s, r) => s + Number(r.sold_qty || 0), 0);
    const revenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    return { soldQty, revenue };
  }, [rows]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;

  return (
    <main className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">판매현황</div>
          <h1 className="mt-2 text-2xl font-bold">물품별 판매 수량/매출</h1>
          <p className="mt-1 text-slate-600">총 판매수량 {totals.soldQty.toLocaleString("ko-KR")}개 · 총 매출 {totals.revenue.toLocaleString("ko-KR")}원</p>
          {msg && <div className="mt-2 text-sm text-rose-700">{msg}</div>}
        </div>
        <div className="flex gap-2">
          <a className="btn" href={`/admin/session/${sessionId}`}>세션 관리</a>
          <a className="btn" href="/admin">세션 목록</a>
        </div>
      </header>

      <section className="card p-4 md:p-6 overflow-auto">
        <table className="min-w-[820px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">물품</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">판매수량</th>
              <th className="px-3 py-2 text-right">매출</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr key={r.product_id}>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(r.price).toLocaleString("ko-KR")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(r.sold_qty || 0).toLocaleString("ko-KR")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(r.revenue || 0).toLocaleString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
