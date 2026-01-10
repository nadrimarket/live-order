"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">로그인</h1>
          <p className="mt-1 text-slate-600">관리자 비밀번호는 서버 환경변수 ADMIN_PASSWORD 입니다.</p>
        </div>
        <a className="btn" href="/">처음</a>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <label className="text-sm font-semibold">비밀번호</label>
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {msg && <div className="text-sm text-rose-700">{msg}</div>}
        <button
          className="btnPrimary"
          onClick={async () => {
            setMsg("");
            const res = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: pw }),
            });
            const j = await res.json();
            if (!res.ok) return setMsg(j?.error ?? "로그인 실패");
            location.href = "/admin";
          }}
        >
          로그인
        </button>
      </section>
    </main>
  );
}
