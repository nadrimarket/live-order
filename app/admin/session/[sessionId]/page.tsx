"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, Session } from "@/lib/types";

export default function AdminSession({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [msg, setMsg] = useState("");

  /* =========================
   * 신규 상품 입력 상태
   * ========================= */
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const newPreview = useMemo(
    () => (newFile ? URL.createObjectURL(newFile) : null),
    [newFile]
  );

  async function reload() {
    setLoaded(false);
    setMsg("");

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

    const r2 = await fetch(`/api/admin/orders?sessionId=${encodeURIComponent(sessionId)}`);
    const j2 = await r2.json();
    if (r2.ok) setOrders(j2.orders ?? []);

    setLoaded(true);
  }

  useEffect(() => {
    reload();
  }, [sessionId]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션 없음. {msg}</div>;

  const isDeleted = !!(session as any)?.is_deleted;

  /* =========================
   * 세션 삭제 / 복구
   * ========================= */
  const onToggleDeleteRestore = async () => {
    const r = await fetch(
      `/api/admin/session/order-count?sessionId=${encodeURIComponent(sessionId)}`
    );
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

    await reload();
  };

  /* =========================
   * 상품 토글 / 삭제
   * ========================= */
  async function toggleActive(id: string) {
    const res = await fetch("/api/admin/product/toggle-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) reload();
  }

  async function toggleSoldout(id: string) {
    const res = await fetch("/api/admin/product/toggle-soldout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) reload();
  }

  async function deleteProduct(id: string) {
    const ok = confirm("이 상품을 삭제(숨김)할까요?");
    if (!ok) return;
    const res = await fetch("/api/admin/product/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id }),
    });
    if (res.ok) reload();
  }

  /* =========================
   * 상품 추가 (이미지 선택)
   * ========================= */
  async function createProduct() {
    const name = newName.trim();
    if (!name || newPrice <= 0) return alert("물품명/가격을 입력하세요.");

    setUploading(true);
    try {
      if (newFile) {
        // 이미지 있는 경우
        const fd = new FormData();
        fd.append("sessionId", sessionId);
        fd.append("name", name);
        fd.append("price", String(newPrice));
        fd.append("file", newFile);

        const res = await fetch("/api/admin/product/create-with-upload", {
          method: "POST",
          body: fd,
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "업로드 실패");
      } else {
        // ✅ 이미지 없이 등록
        const res = await fetch("/api/admin/product/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            name,
            price: newPrice,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? "등록 실패");
      }

      setNewName("");
      setNewPrice(0);
      setNewFile(null);
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "상품 등록 실패");
    } finally {
      setUploading(false);
    }
  }

  /* =========================
   * 렌더
   * ========================= */
  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">{session.title}</h1>
          <div className="mt-1 text-sm text-slate-600">
            세션ID: <span className="font-mono">{session.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={`/s/${sessionId}`}>고객 페이지</a>
          <a className="btn" href="/admin">세션 목록</a>
          <a className="btnPrimary" href={`/admin/session/${sessionId}/summary`}>판매현황</a>
          <button className="btn" onClick={onToggleDeleteRestore}>
            {isDeleted ? "세션 복구" : "세션 삭제"}
          </button>
        </div>
      </header>

      {/* ================= 상품 관리 ================= */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">판매 물품 관리</div>

        <div className="grid grid-cols-1 gap-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-slate-100" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {p.name}
                    {p.is_soldout && <span className="ml-2 badge">품절</span>}
                    {!p.is_active && <span className="ml-2 badge">OFF</span>}
                  </div>
                  <div className="text-sm text-slate-600">
                    {p.price.toLocaleString("ko-KR")}원
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn" onClick={() => toggleActive(p.id)}>
                  {p.is_active ? "판매OFF" : "판매ON"}
                </button>
                <button className="btn" onClick={() => toggleSoldout(p.id)}>
                  {p.is_soldout ? "품절해제" : "품절"}
                </button>
                <button className="btn" onClick={() => deleteProduct(p.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 신규 상품 추가 */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_1fr_120px] pt-2 items-center">
          <input
            className="input"
            placeholder="물품명"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="input"
            placeholder="가격"
            value={newPrice}
            onChange={(e) =>
              setNewPrice(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
            }
          />
          <div className="flex items-center gap-2">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
            />
            {newPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newPreview} className="h-10 w-10 rounded-lg object-cover" />
            )}
          </div>
          <button className="btnPrimary" disabled={uploading} onClick={createProduct}>
            {uploading ? "처리중..." : "추가"}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          * 이미지는 선택사항입니다. (없어도 등록 가능)
        </div>
      </section>
    </main>
  );
}
