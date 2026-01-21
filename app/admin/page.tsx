import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";
import AdminSessionRow from "@/components/AdminSessionRow";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  title: string;
  is_closed: boolean;
  is_deleted: boolean;
  created_at: string;
};

export default async function AdminHome() {
  if (!isAdmin()) {
    return (
      <main className="space-y-4">
        <div className="card p-4">
          관리자 로그인이 필요합니다.{" "}
          <a className="btn" href="/admin/login">
            로그인
          </a>
        </div>
      </main>
    );
  }

  const sb = supabaseAnon();

  // ✅ 한 번만 가져오고(삭제 포함), 화면에서 분리해서 중복 방지
  const { data, error } = await sb
    .from("sessions")
    .select("id,title,is_closed,is_deleted,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main className="space-y-4">
        <div className="card p-4">
          <div className="font-semibold">세션 목록을 불러오지 못했어요.</div>
          <div className="text-sm text-slate-600">{error.message}</div>
        </div>
      </main>
    );
  }

  const sessions = (data ?? []) as SessionRow[];

  const activeSessions = sessions.filter((s) => !s.is_deleted);
  const deletedSessions = sessions.filter((s) => s.is_deleted);

  return (
    <main className="space-y-6">
      {/* (헤더는 기존 그대로) */}

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">세션 목록</div>
          <span className="badge">{activeSessions.length}개</span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-sm text-slate-600">진행중/보관중인 세션이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {activeSessions.map((s) => (
              <AdminSessionRow key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      <section className="card p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">삭제된 세션</div>
          <span className="badge">{deletedSessions.length}개</span>
        </div>

        {deletedSessions.length === 0 ? (
          <div className="text-sm text-slate-600">삭제된 세션이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {deletedSessions.map((s) => (
              <AdminSessionRow key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
