import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";
import AdminSessionRow from "@/components/AdminSessionRow";

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

  const { data: sessions } = await sb
    .from("sessions")
    .select("id,title,is_closed,is_deleted,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: deletedSessions } = await sb
    .from("sessions")
    .select("id,title,is_closed,created_at,is_deleted")
    .eq("is_deleted", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="space-y-6">
      {/* (헤더는 기존 그대로) */}

      <section className="card p-4 md:p-6 space-y-3">
        <div className="font-semibold">세션 목록</div>
        <div className="grid grid-cols-1 gap-2">
          {(sessions ?? []).map((s) => <AdminSessionRow key={s.id} s={s} />)}
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">삭제된 세션</div>
          <span className="badge">{(deletedSessions ?? []).length}개</span>
        </div>
        {(deletedSessions ?? []).length === 0 ? (
          <div className="text-sm text-slate-600">삭제된 세션이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {(deletedSessions ?? []).map((s) => <AdminSessionRow key={s.id} s={s} />)}
          </div>
        )}
      </section>
    </main>
  );
}
