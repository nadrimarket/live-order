import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라이브 주문/정산",
  description: "라이브 방송용 주문/정산 (Supabase 실사용 버전)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </body>
    </html>
  );
}
