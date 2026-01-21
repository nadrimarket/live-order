"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  session_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_soldout?: boolean;
  sort_order: number;
  deleted_at?: string | null;
  created_at?: string;
};

async function apiGet(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}
async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}

export default function AdminProductsPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(() => items.find((p) => p.id === editingId) ?? null, [items, editingId]);

  const [form, setForm] = useState({ name: "", price: "0", image_url: "", sort_order: "1" });

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const json = await apiGet(`/api/admin/products/list?sessionId=${encodeURIComponent(sessionId)}`);
      setItems(json.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name ?? "",
      price: String(p.price ?? 0),
      image_url: p.image_url ?? "",
      sort_order: String(p.sort_order ?? 1),
    });
  }
  function closeEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setErr("");
    try {
      const json = await apiPost("/api/admin/products/update", {
        id: editingId,
        name: form.name,
        price: Number(form.price),
        image_url: form.image_url ? form.image_url : null,
        sort_order: Number(form.sort_order),
      });
      setItems((prev) => prev.map((p) => (p.id === editingId ? json.item : p)));
      closeEdit();
    } catch (e: any) {
      setErr(e?.message ?? "수정 실패");
    }
  }

  async function toggleActive(id: string) {
    setErr("");
    try {
      const json = await apiPost("/api/admin/products/toggle-active", { id });
      setItems((prev) => prev.map((p) => (p.id === id ? json.item : p)));
    } catch (e: any) {
      setErr(e?.message ?? "판매 토글 실패");
    }
  }

  async function toggleSoldout(id: string) {
    setErr("");
    try {
      const json = await apiPost("/api/admin/products/toggle-soldout", { id });
      setItems((prev) => prev.map((p) => (p.id === id ? json.item : p)));
    } catch (e: any) {
      setErr(e?.message ?? "품절 토글 실패");
    }
  }

  async function softDelete(id: string) {
    if (!confirm("이 상품을 삭제(숨김) 처리할까요?")) return;
    setErr("");
    try {
      const json = await apiPost("/api/admin/products/delete", { id });
      setItems((prev) => prev.map((p) => (p.id === id ? json.item : p)));
    } catch (e: any) {
      setErr(e?.message ?? "삭제 실패");
    }
  }

  const aliveItems = useMemo(() => items.filter((p) => !p.deleted_at), [items]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <Link className="btn" href="/admin">
            ← 관리자 홈
          </Link>
          <span className="font-semibold">물품 관리</span>
        </div>
        <button className="btn" onClick={refresh} disabled={loading}>
          새로고침
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm whitespace-pre-wrap">
          {err}
        </div>
      )}

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">상품 목록</div>
          <span className="badge">{aliveItems.length}개</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {aliveItems.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold truncate">
                    {p.sort_order}. {p.name}
                    {(p.is_soldout ?? false) && <span className="ml-2 badge">품절</span>}
                    {!p.is_active && <span className="ml-2 badge">OFF</span>}
                  </div>
                  <div className="text-sm text-slate-600">
                    {Number(p.price ?? 0).toLocaleString("ko-KR")}원
                  </div>
                  {p.image_url && (
                    <div className="text-xs text-slate-500 truncate">img: {p.image_url}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="btn" onClick={() => openEdit(p)}>
                    수정
                  </button>
                  <button className="btn" onClick={() => toggleSoldout(p.id)}>
                    {(p.is_soldout ?? false) ? "품절해제" : "품절"}
                  </button>
                  <button className="btn" onClick={() => toggleActive(p.id)}>
                    {p.is_active ? "판매OFF" : "판매ON"}
                  </button>
                  <button className="btn" onClick={() => softDelete(p.id)}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loading && aliveItems.length === 0 && (
            <div className="text-sm text-slate-600">상품이 없습니다.</div>
          )}
        </div>
      </section>

      {editing && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
          onClick={closeEdit}
        >
          <div className="card w-full max-w-lg p-4 md:p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-lg">상품 수정</div>

            <div className="grid gap-3">
              <label className="space-y-1">
                <div className="text-sm font-semibold">상품명</div>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-semibold">가격</div>
                <input
                  className="input text-right"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-semibold">이미지 URL(선택)</div>
                <input
                  className="input"
                  value={form.image_url}
                  onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
                />
              </label>

              <label className="space-y-1">
                <div className="text-sm font-semibold">정렬(sort_order)</div>
                <input
                  className="input text-right"
                  inputMode="numeric"
                  value={form.sort_order}
                  onChange={(e) => setForm((s) => ({ ...s, sort_order: e.target.value }))}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn" onClick={closeEdit}>
                취소
              </button>
              <button className="btnPrimary" onClick={saveEdit}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
