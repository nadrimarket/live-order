"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, Session } from "@/lib/types";

type EditForm = {
  name: string;
  price: string;
  image_url: string;
  sort_order: string;
};

type ManualLine = { product_id: string; qty: number };

// 배송 타입(프로젝트에 이미 쓰는 값이 있으면 그걸로 맞추면 됨)
type ShippingType = "택배" | "직거래" | "기타";

export default function AdminSessionPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [msg, setMsg] = useState("");

  // 신규 상품 등록 (이미지 선택사항)
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const newPreview = useMemo(() => (newFile ? URL.createObjectURL(newFile) : null), [newFile]);

  // ✅ 주문 필터
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyUnshipped, setOnlyUnshipped] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // 상품 인라인 수정
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditForm>({
    name: "",
    price: "0",
    image_url: "",
    sort_order: "1",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // ===== 수기 주문(관리자) =====
  const [mNick, setMNick] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mPostal, setMPostal] = useState("");
  const [mAddr1, setMAddr1] = useState("");
  const [mAddr2, setMAddr2] = useState("");
  const [mShipping, setMShipping] = useState<ShippingType>("택배");
  const [mLines, setMLines] = useState<ManualLine[]>([]);
  const [mSubmitting, setMSubmitting] = useState(false);

  function setLineQty(product_id: string, qty: number) {
    const safeQty = Number.isFinite(qty) ? qty : 0;

    setMLines((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => x.product_id === product_id);

      if (safeQty <= 0) {
        if (idx >= 0) next.splice(idx, 1);
        return next;
      }

      if (idx >= 0) next[idx] = { product_id, qty: safeQty };
      else next.push({ product_id, qty: safeQty });
      return next;
    });
  }

  const manualTotal = useMemo(() => {
    const map = new Map<string, any>();
    (products ?? []).forEach((p: any) => map.set(p.id, p));

    const total_qty = (mLines ?? []).reduce((a, l) => a + (Number(l.qty) || 0), 0);
    const total_amount = (mLines ?? []).reduce((a, l) => {
      const p = map.get(l.product_id);
      const price = Number(p?.price ?? 0) || 0;
      return a + price * (Number(l.qty) || 0);
    }, 0);

    return { total_qty, total_amount };
  }, [mLines, products]);

  async function createManualOrder() {
    const nickname = mNick.trim();
    if (!nickname) return alert("닉네임을 입력하세요.");
    if (!mLines.length) return alert("상품/수량을 선택하세요.");

    // 품절/숨김/삭제 상품이 끼어들면 클라에서도 한번 더 막기
    const pMap = new Map<string, any>();
    (products ?? []).forEach((p: any) => pMap.set(p.id, p));

    for (const l of mLines) {
      const p = pMap.get(l.product_id);
      if (!p) return alert("선택된 상품이 목록에 없습니다. 새로고침 후 다시 시도하세요.");
      if (p.deleted_at) return alert(`삭제된 상품이 포함되어 있습니다: ${p.name}`);
      if (p.is_hidden) return alert(`숨김 상품이 포함되어 있습니다: ${p.name}`);
      if (p.is_soldout) return alert(`품절 상품은 수기주문에 담을 수 없습니다: ${p.name}`);
    }

    setMSubmitting(true);
    try {
      // 기존 프로젝트에서 admin PIN을 localStorage에 저장하고 있다면 그대로 사용
      // 없으면 빈 값으로 보내도 되며, 서버가 PIN을 강제하지 않는 구조라면 무시됨
      const adminPin = localStorage.getItem("admin_pin") || "";

      const res = await fetch("/api/admin/orders/manual/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminPin ? { "x-admin-pin": adminPin } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          nickname,
          phone: mPhone.trim(),
          postal_code: mPostal.trim(),
          address1: mAddr1.trim(),
          address2: mAddr2.trim(),
          shipping: mShipping,
          lines: mLines,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        alert(j?.message || j?.error || `수기 주문 생성 실패 (HTTP ${res.status})`);
        return;
      }

      // 폼 리셋
      setMNick("");
      setMPhone("");
      setMPostal("");
      setMAddr1("");
      setMAddr2("");
      setMShipping("택배");
      setMLines([]);

      await reload();
      alert("수기 주문 생성 완료!");
    } catch (e: any) {
      alert(e?.message ?? "수기 주문 생성 실패");
    } finally {
      setMSubmitting(false);
    }
  }
  // ===== 수기 주문(관리자) 끝 =====

  async function apiJson(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    // 관리자 API들 응답키가 error/message 혼재할 수 있어 둘 다 처리
    if (!res.ok) throw new Error(json?.error ?? json?.message ?? `HTTP ${res.status}`);
    return json;
  }

  async function reload() {
    setLoaded(false);
    setMsg("");

    try {
      const j = await apiJson(`/api/admin/session/${sessionId}`, { cache: "no-store" });
      setSession(j.session);
      setProducts(j.products ?? []);
      setNotice(j.notice ?? "");

      // ✅ includeDeleted 반영해서 서버에서 주문 가져오기
      const j2 = await apiJson(
        `/api/admin/orders?sessionId=${encodeURIComponent(sessionId)}&includeDeleted=${includeDeleted ? "1" : "0"}`,
        { cache: "no-store" }
      );
      setOrders(j2.orders ?? []);
    } catch (e: any) {
      setMsg(e?.message ?? "불러오기 실패");
      setSession(null);
      setProducts([]);
      setOrders([]);
      setNotice("");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ✅ includeDeleted 변경 시 서버 재조회(삭제포함 토글 반영)
  useEffect(() => {
    if (!loaded) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션 없음. {msg}</div>;

  const isDeleted = !!(session as any)?.is_deleted;

  // 세션 LIVE/마감
  async function setLive(next: boolean) {
    try {
      const j = await apiJson("/api/admin/session/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, is_closed: !next ? true : false }),
      });
      if (j?.session) setSession(j.session);
    } catch (e: any) {
      alert(e?.message ?? "상태 변경 실패");
    }
  }

  // 세션 삭제/복구
  async function onToggleDeleteRestore() {
    try {
      const jCount = await apiJson(
        `/api/admin/session/order-count?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" }
      );
      const orderCount = jCount?.ok ? Number(jCount.count ?? 0) : 0;

      if (!isDeleted) {
        const ok = confirm(
          orderCount > 0
            ? `⚠️ 이 세션에는 주문이 ${orderCount}건 있습니다.\n\n세션을 삭제(숨김)해도 주문 데이터는 남아있습니다.\n정말 삭제할까요?`
            : "정말 이 세션을 삭제할까요?\n(세션은 목록에서 숨김 처리됩니다.)"
        );
        if (!ok) return;

        const j = await apiJson("/api/admin/session/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!j?.ok) throw new Error(j?.error ?? "삭제 실패");
        await reload();
        return;
      }

      const ok2 = confirm("이 세션을 복구할까요? (목록에 다시 표시됩니다)");
      if (!ok2) return;

      const j2 = await apiJson("/api/admin/session/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!j2?.ok) throw new Error(j2?.error ?? "복구 실패");
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "처리 실패");
    }
  }

  // 상품: 품절 토글
  async function toggleSoldout(id: string) {
    try {
      await apiJson("/api/admin/product/toggle-soldout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "품절 처리 실패");
    }
  }

  // 상품: 삭제(숨김)
  async function deleteProduct(id: string) {
    const ok = confirm("이 상품을 삭제(숨김)할까요?");
    if (!ok) return;
    try {
      await apiJson("/api/admin/product/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "삭제 실패");
    }
  }

  // 상품: 수정 시작/취소/저장
  function startEdit(p: any) {
    setEditingId(p.id);
    setEdit({
      name: String(p.name ?? ""),
      price: String(p.price ?? 0),
      image_url: String(p.image_url ?? ""),
      sort_order: String(p.sort_order ?? 1),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit({ name: "", price: "0", image_url: "", sort_order: "1" });
  }

  async function saveEdit() {
    if (!editingId) return;

    const name = edit.name.trim();
    const price = Number(String(edit.price ?? "0").replace(/[^0-9]/g, "")) || 0;
    const sort_order = Number(String(edit.sort_order ?? "1").replace(/[^0-9]/g, "")) || 1;
    const image_url = edit.image_url.trim();

    if (!name) return alert("상품명을 입력하세요.");
    if (price <= 0) return alert("가격을 1원 이상 입력하세요.");
    if (sort_order <= 0) return alert("정렬(sort_order)을 1 이상 입력하세요.");

    setSavingEdit(true);
    try {
      await apiJson("/api/admin/product/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name,
          price,
          sort_order,
          image_url: image_url ? image_url : null,
        }),
      });
      await reload();
      cancelEdit();
    } catch (e: any) {
      alert(e?.message ?? "수정 실패");
    } finally {
      setSavingEdit(false);
    }
  }

  // 상품: 등록 (이미지 선택사항)
  async function createProduct() {
    const name = newName.trim();
    if (!name) return alert("물품명을 입력하세요.");
    if (newPrice <= 0) return alert("가격을 1원 이상 입력하세요.");

    setUploading(true);
    try {
      if (newFile) {
        const fd = new FormData();
        fd.append("sessionId", sessionId);
        fd.append("name", name);
        fd.append("price", String(newPrice));
        fd.append("file", newFile);

        const res = await fetch("/api/admin/product/create-with-upload", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error ?? "업로드 실패");
      } else {
        await apiJson("/api/admin/product/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, name, price: newPrice }),
        });
      }

      setNewName("");
      setNewPrice(0);
      setNewFile(null);
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "등록 실패");
    } finally {
      setUploading(false);
    }
  }

  async function saveNotice() {
    try {
      const j = await apiJson("/api/admin/notice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, notice }),
      });
      if (!j?.ok) throw new Error(j?.error ?? "저장 실패");
      alert("저장 완료!");
    } catch (e: any) {
      alert(e?.message ?? "저장 실패");
    }
  }

  // ✅ 주문: 입금/발송 토글
  async function togglePaid(orderId: string) {
    try {
      await apiJson("/api/admin/orders/toggle-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "입금 상태 변경 실패");
    }
  }

  async function toggleShipped(orderId: string) {
    try {
      await apiJson("/api/admin/orders/toggle-shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "발송 상태 변경 실패");
    }
  }

  // ✅ 화면 필터(클라) 적용
  const visibleOrders = (orders ?? []).filter((o: any) => {
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
            세션ID: <span className="font-mono">{session.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
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

      {msg && <div className="card p-4 text-sm">{msg}</div>}

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">방송 상태</div>
          {session.is_closed ? <span className="badge">마감</span> : <span className="badge">LIVE</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setLive(true)}>
            LIVE로 열기
          </button>
          <button className="btnPrimary" onClick={() => setLive(false)}>
            방송 마감
          </button>
        </div>
      </section>

      {/* 물품 관리 */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">판매 물품 관리 (이미지 선택사항)</div>

        <div className="grid grid-cols-1 gap-2">
          {products.map((p: any) => {
            const isEditing = editingId === p.id;

            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200" />
                    )}

                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {p.name}
                        {p.is_soldout && <span className="ml-2 badge">품절</span>}
                      </div>
                      <div className="text-sm text-slate-600">{Number(p.price ?? 0).toLocaleString("ko-KR")}원</div>
                      <div className="text-xs text-slate-500">sort_order: {p.sort_order ?? 1}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {!isEditing ? (
                      <>
                        <button className="btn" onClick={() => startEdit(p)}>
                          수정
                        </button>
                        <button className="btn" onClick={() => toggleSoldout(p.id)}>
                          {p.is_soldout ? "품절해제" : "품절"}
                        </button>
                        <button className="btn" onClick={() => deleteProduct(p.id)}>
                          삭제
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={cancelEdit} disabled={savingEdit}>
                          취소
                        </button>
                        <button className="btnPrimary" onClick={saveEdit} disabled={savingEdit}>
                          {savingEdit ? "저장중..." : "저장"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input
                      className="input md:col-span-2"
                      placeholder="상품명"
                      value={edit.name}
                      onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="가격"
                      inputMode="numeric"
                      value={edit.price}
                      onChange={(e) => setEdit((s) => ({ ...s, price: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="정렬(sort_order)"
                      inputMode="numeric"
                      value={edit.sort_order}
                      onChange={(e) => setEdit((s) => ({ ...s, sort_order: e.target.value }))}
                    />
                    <input
                      className="input md:col-span-4"
                      placeholder="이미지 URL(선택)"
                      value={edit.image_url}
                      onChange={(e) => setEdit((s) => ({ ...s, image_url: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 신규 상품 추가 */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_1fr_120px] pt-2 items-center">
          <input className="input" placeholder="물품명" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input
            className="input"
            placeholder="가격"
            value={newPrice}
            onChange={(e) => setNewPrice(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
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
              <img src={newPreview} alt="preview" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
            )}
          </div>
          <button className="btnPrimary" disabled={uploading} onClick={createProduct}>
            {uploading ? "처리중..." : "추가"}
          </button>
        </div>

        <div className="text-xs text-slate-500">* 이미지는 선택사항입니다. (없어도 등록 가능)</div>
      </section>

      {/* ===== 수기 주문 추가 ===== */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">수기 주문 추가 (DM/카톡/전화)</div>
          <div className="text-sm text-slate-600">
            합계: <span className="font-semibold">{manualTotal.total_qty}</span>개 /{" "}
            <span className="font-semibold">{manualTotal.total_amount.toLocaleString("ko-KR")}</span>원
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input className="input" placeholder="닉네임*" value={mNick} onChange={(e) => setMNick(e.target.value)} />
          <input className="input" placeholder="연락처" value={mPhone} onChange={(e) => setMPhone(e.target.value)} />
          <div className="md:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr]">
            <select className="input" value={mShipping} onChange={(e) => setMShipping(e.target.value as ShippingType)}>
              <option value="택배">택배</option>
              <option value="직거래">직거래</option>
              <option value="기타">기타</option>
            </select>
            <div className="text-sm text-slate-600 flex items-center">배송 방식 선택</div>
          </div>
          <input className="input" placeholder="우편번호" value={mPostal} onChange={(e) => setMPostal(e.target.value)} />
          <input className="input" placeholder="주소1" value={mAddr1} onChange={(e) => setMAddr1(e.target.value)} />
          <input className="input md:col-span-2" placeholder="주소2" value={mAddr2} onChange={(e) => setMAddr2(e.target.value)} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <div className="font-semibold">상품/수량</div>

          <div className="grid grid-cols-1 gap-2">
            {(products ?? [])
              .filter((p: any) => !p.deleted_at)
              .map((p: any) => {
                const current = mLines.find((x) => x.product_id === p.id)?.qty ?? 0;
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

          <div className="pt-2 flex flex-wrap gap-2 items-center">
            <button className="btnPrimary" onClick={createManualOrder} disabled={mSubmitting}>
              {mSubmitting ? "생성 중..." : "수기 주문 생성"}
            </button>
            <button className="btn" onClick={() => setMLines([])} disabled={mSubmitting}>
              수량 초기화
            </button>
            <div className="text-xs text-slate-500">
              * 품절/숨김/삭제 상품은 수기주문에 담을 수 없게 막아두었습니다.
            </div>
          </div>
        </div>
      </section>
      {/* ===== 수기 주문 끝 ===== */}

      {/* 안내문 */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">안내문(정산서 오른쪽)</div>
        <textarea
          className="input h-[240px] font-mono text-sm leading-6"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
        />
        <button className="btnPrimary" onClick={saveNotice}>
          안내문 저장
        </button>
      </section>

      {/* 주문 */}
      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">주문(주소/연락처 포함)</div>
          <span className="badge">{visibleOrders.length}건</span>
        </div>

        {/* ✅ 필터 + 새로고침 */}
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyUnpaid} onChange={(e) => setOnlyUnpaid(e.target.checked)} />
            미입금만
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyUnshipped} onChange={(e) => setOnlyUnshipped(e.target.checked)} />
            미발송만
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
            삭제포함
          </label>
          <button className="btn" onClick={reload}>
            새로고침
          </button>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">닉네임</th>
                <th className="px-3 py-2 text-left">연락처</th>
                <th className="px-3 py-2 text-left">배송</th>
                <th className="px-3 py-2 text-left">주소</th>
                <th className="px-3 py-2 text-left">입금</th>
                <th className="px-3 py-2 text-left">발송</th>
                <th className="px-3 py-2 text-left">작업</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {visibleOrders.map((o: any) => {
                const deleted = !!o.deleted_at;
                const isManual = !!o.is_manual;

                return (
                  <tr key={o.id} className={deleted ? "opacity-60" : ""}>
                    <td className="px-3 py-2 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        {o.nickname}
                        {isManual ? <span className="badge">수기</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-2">{o.phone ?? "-"}</td>
                    <td className="px-3 py-2">{o.shipping}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {(o.postal_code ? `[${o.postal_code}] ` : "") + (o.address1 ?? "") + (o.address2 ? " " + o.address2 : "")}
                    </td>

                    <td className="px-3 py-2">
                      <button className={o.paid_at ? "btnPrimary" : "btn"} onClick={() => togglePaid(o.id)}>
                        {o.paid_at ? "입금완료" : "미입금"}
                      </button>
                    </td>

                    <td className="px-3 py-2">
                      <button className={o.shipped_at ? "btnPrimary" : "btn"} onClick={() => toggleShipped(o.id)}>
                        {o.shipped_at ? "발송완료" : "미발송"}
                      </button>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <a className="btn" href={`/order/edit/${o.edit_token}`}>
                          수정
                        </a>
                        <a className="btnPrimary" href={`/receipt/token/${o.edit_token}`}>
                          정산서(JPG)
                        </a>

                        <button
                          className="btn"
                          onClick={async () => {
                            const ok = confirm(`${o.nickname}님의 주문을 삭제(숨김)할까요?`);
                            if (!ok) return;

                            try {
                              const j = await apiJson("/api/admin/order/delete", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ orderId: o.id }),
                              });
                              if (!j?.ok) throw new Error(j?.error ?? "삭제 실패");
                              await reload();
                            } catch (e: any) {
                              alert(e?.message ?? "삭제 실패");
                            }
                          }}
                        >
                          주문 삭제
                        </button>

                        <button
                          className="btn"
                          onClick={async () => {
                            const text = `[정산 안내]\n${o.nickname}님\n정산서: ${location.origin}/receipt/token/${o.edit_token}\n(위 링크에서 JPG 저장 가능)\n\n연락처: ${
                              o.phone ?? "-"
                            }\n배송: ${o.shipping ?? "-"}\n주소: ${(o.postal_code ? `[${o.postal_code}] ` : "") + (o.address1 ?? "") + (o.address2 ? " " + o.address2 : "")}`;
                            await navigator.clipboard.writeText(text);
                            alert("카톡으로 보낼 문구를 복사했어요. 카카오톡에 붙여넣기 하시면 됩니다.");
                          }}
                        >
                          카톡문구 복사
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visibleOrders.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={7}>
                    주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
