"use client";

import { useState } from "react";

export default function NewSession() {
  const [title, setTitle] = useState("오늘 라이브");
  const [msg, setMsg] = useState("");

  return (
    <main className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">새 세션 만들기</h1>
        </div>
        <a className="btn" href="/admin">뒤로</a>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <label className="text-sm font-semibold">방송 제목</label>
        <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} />
        {msg && <div className="text-sm text-rose-700">{msg}</div>}
        <button className="btnPrimary" onClick={async ()=>{
          setMsg("");
          const res = await fetch("/api/admin/session/create", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ title })});
          const j = await res.json();
          if(!res.ok) return setMsg(j?.error ?? "실패");
          location.href = `/admin/session/${j.id}`;
        }}>생성</button>
      </section>
    </main>
  );
}
