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

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const newPreview = useMemo(() => (newFile ? URL.createObjectURL(newFile) : null), [newFile]);

  async function reload() {
    const res = await fetch(`/api/admin/session/${sessionId}`);
    const j = await res.json();
    if (!res.ok) { setMsg(j?.error ?? "불러오기 실패"); setLoaded(true); return; }
    setSession(j.session);
    setProducts(j.products ?? []);
    setNotice(j.notice ?? "");
    setLoaded(true);

    const r2 = await fetch(`/api/admin/orders?sessionId=${encodeURIComponent(sessionId)}`);
    const j2 = await r2.json();
    if (r2.ok) setOrders(j2.orders ?? []);
  }

  useEffect(() => { reload(); }, [sessionId]);

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!session) return <div className="text-slate-600">세션 없음. {msg}</div>;

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">{session.title}</h1>
          <div className="mt-1 text-sm text-slate-600">세션ID: <span className="font-mono">{session.id}</span></div>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={`/s/${sessionId}`}>고객 페이지</a>
          <a className="btn" href="/admin">세션 목록</a>
          <a className="btnPrimary" href={`/admin/session/${sessionId}/summary`}>판매현황</a>
          <button
  className="btn"
  onClick={async () => {
    // 1️⃣ 주문 건수 조회 (경고용)
    const r = await fetch(
      `/api/admin/session/order-count?sessionId=${encodeURIComponent(sessionId)}`
    );
    const j = await r.json();
    const orderCount = r.ok && j.ok ? (j.count ?? 0) : 0;

    const isDeleted = !!session?.is_deleted;

    // 2️⃣ 삭제 로직
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

      if (!res.ok || !jj.ok) {
        alert(jj?.error ?? "삭제 실패");
        return;
      }

      alert("세션이 삭제되었습니다.");
      await reload(); // ⭐ 기존 reload() 그대로 사용
      return;
    }

    // 3️⃣ 복구 로직
    const ok2 = confirm("이 세션을 복구할까요? (목록에 다시 표시됩니다)");
    if (!ok2) return;

    const res2 = await fetch("/api/admin/session/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const jj2 = await res2.json();

    if (!res2.ok || !jj2.ok) {
      alert(jj2?.error ?? "복구 실패");
      return;
    }

    alert("세션이 복구되었습니다.");
    await reload();
  }}
>
  {session?.is_deleted ? "세션 복구" : "세션 삭제"}
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
          <button className="btn" onClick={async ()=>{
            const res = await fetch("/api/admin/session/toggle", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId, is_closed:false })});
            const j = await res.json();
            if(res.ok) setSession(j.session);
          }}>LIVE로 열기</button>
          <button className="btnPrimary" onClick={async ()=>{
            const res = await fetch("/api/admin/session/toggle", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId, is_closed:true })});
            const j = await res.json();
            if(res.ok) setSession(j.session);
          }}>방송 마감</button>
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">판매 물품(사진은 파일 업로드)</div>

        <div className="grid grid-cols-1 gap-2">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-sm text-slate-600">{p.price.toLocaleString("ko-KR")}원</div>
                </div>
              </div>
              <button className="btn" onClick={async ()=>{
                const res = await fetch("/api/admin/product/delete", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ productId:p.id })});
                const j = await res.json();
                if(res.ok) setProducts(j.products ?? []);
              }}>삭제</button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_1fr_120px] pt-2 items-center">
          <input className="input" placeholder="물품명" value={newName} onChange={(e)=>setNewName(e.target.value)} />
          <input className="input" placeholder="가격" value={newPrice} onChange={(e)=>setNewPrice(Number(e.target.value.replace(/[^0-9]/g,""))||0)} />
          <div className="flex items-center gap-2">
            <input className="input" type="file" accept="image/*" onChange={(e)=>setNewFile(e.target.files?.[0] ?? null)} />
            {newPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newPreview} alt="preview" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
            )}
          </div>
          <button className="btnPrimary" disabled={uploading} onClick={async ()=>{
            const name=newName.trim();
            if(!name || newPrice<=0) return alert("물품명/가격 입력");
            if(!newFile) return alert("사진 파일을 선택하세요.");
            setUploading(true);
            try{
              const fd = new FormData();
              fd.append("sessionId", sessionId);
              fd.append("name", name);
              fd.append("price", String(newPrice));
              fd.append("file", newFile);

              const res = await fetch("/api/admin/product/create-with-upload", { method:"POST", body: fd });
              const j = await res.json();
              if(!res.ok) throw new Error(j?.error ?? "실패");
              setProducts(j.products ?? []);
              setNewName(""); setNewPrice(0); setNewFile(null);
            }catch(e:any){
              alert(e?.message ?? "업로드 실패");
            }finally{
              setUploading(false);
            }
          }}>{uploading ? "업로드중..." : "추가"}</button>
        </div>

        <div className="text-xs text-slate-500">
          * Supabase Storage 버킷 <b>product-images</b> 를 <b>Public</b>로 만들어야 이미지가 고객 화면에 표시됩니다.
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">안내문(정산서 오른쪽)</div>
        <textarea className="input h-[240px] font-mono text-sm leading-6" value={notice} onChange={(e)=>setNotice(e.target.value)} />
        <button className="btnPrimary" onClick={async ()=>{
          const res = await fetch("/api/admin/notice/save", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId, notice })});
          const j = await res.json();
          if(!res.ok) return alert(j?.error ?? "저장 실패");
          alert("저장 완료!");
        }}>안내문 저장</button>
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">주문(주소/연락처 포함)</div>
          <span className="badge">{orders.length}건</span>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">닉네임</th>
                <th className="px-3 py-2 text-left">연락처</th>
                <th className="px-3 py-2 text-left">배송</th>
                <th className="px-3 py-2 text-left">주소</th>
                <th className="px-3 py-2 text-left">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="px-3 py-2 font-semibold">{o.nickname}</td>
                  <td className="px-3 py-2">{o.phone ?? "-"}</td>
                  <td className="px-3 py-2">{o.shipping}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {(o.postal_code ? `[${o.postal_code}] ` : "") + (o.address1 ?? "") + (o.address2 ? " " + o.address2 : "")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <a className="btn" href={`/order/edit/${o.edit_token}`}>수정</a>
                      <a className="btnPrimary" href={`/receipt/token/${o.edit_token}`}>정산서(JPG)</a>
    <button
      className="btn"
      onClick={async () => {
        const ok = confirm(`${o.nickname}님의 주문을 삭제(숨김)할까요?`);
        if (!ok) return;

        const res = await fetch("/api/admin/order/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: o.id }),
        });
        const j = await res.json();
        if (!res.ok || !j.ok) {
          alert(j?.error ?? "삭제 실패");

        await reload();
      }}
    >
      주문 삭제
    </button>
  </div>
</td>
                      <button className="btn" onClick={async ()=>{
                        const msg =
`[정산 안내]\n${o.nickname}님\n정산서: ${location.origin}/receipt/token/${o.edit_token}\n(위 링크에서 JPG 저장 가능)\n\n연락처: ${o.phone ?? "-"}\n주소: ${(o.postal_code ? `[${o.postal_code}] ` : "") + (o.address1 ?? "") + (o.address2 ? " " + o.address2 : "")}`;
                        await navigator.clipboard.writeText(msg);
                        alert("카톡으로 보낼 문구를 복사했어요. 카카오톡에 붙여넣기 하시면 됩니다.");
                      }}>카톡문구 복사</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
