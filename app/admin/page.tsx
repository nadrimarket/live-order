import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";

export default async function AdminHome() {
  if (!isAdmin()) {
    return (
      <main className="space-y-4">
        <div className="card p-4">
          관리자 로그인이 필요합니다. <a className="btn" href="/admin/login">로그인</a>
        </div>
      </main>
    );
  }

  const sb = supabaseAnon();
  const { data: sessions } = await sb.from("sessions").select("id,title,is_closed,created_at").order("created_at", { ascending: false }).limit(50);

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">관리자</div>
          <h1 className="mt-2 text-2xl font-bold">세션 관리</h1>
        </div>
        <div className="flex gap-2">
          <a className="btn" href="/admin/session/new">새 세션</a>
          <a className="btn" href="/api/admin/logout">로그아웃</a>
        </div>
      </header>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">세션 목록</div>
        <div className="grid grid-cols-1 gap-2">
          {(sessions ?? []).map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.title}</div>
                <div className="text-xs text-slate-600">{new Date(s.created_at).toLocaleString("ko-KR")}</div>
              </div>
              <div className="flex items-center gap-2">
                {s.is_closed ? <span className="badge">마감</span> : <span className="badge">LIVE</span>}
                <a className="btn" href={`/admin/session/${s.id}`}>관리</a>
                <a className="btnPrimary" href={`/admin/session/${s.id}/summary`}>판매현황</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
