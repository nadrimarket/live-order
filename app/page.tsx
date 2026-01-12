import { supabaseAnon } from "@/lib/supabase";

export default async function Home() {
  const sb = supabaseAnon();
  const { data: sessions, error } = await sb
    .from("sessions")
    .is("deleted_at", null)
    .select("id,title,is_closed,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">라이브 주문/정산 (v3)</h1>
          <p className="mt-1 text-slate-600">상품 사진(파일 업로드) · 주소/연락처 · 정산서 JPG</p>
        </div>
        <a className="btn" href="/admin/login">관리자 로그인</a>
      </header>

      {error && (
        <div className="card p-4 text-sm text-rose-700">
          Supabase 연결 오류: {error.message}
          <div className="mt-2 text-slate-600">.env.local 설정을 확인하세요.</div>
        </div>
      )}

      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">방송 세션</div>
        <div className="grid grid-cols-1 gap-2">
          {(sessions ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.title}</div>
                <div className="text-xs text-slate-600">{new Date(s.created_at).toLocaleString("ko-KR")}</div>
              </div>
              <div className="flex items-center gap-2">
                {s.is_closed ? <span className="badge">마감</span> : <span className="badge">LIVE</span>}
                <a className="btnPrimary" href={`/s/${s.id}`}>고객 주문</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
