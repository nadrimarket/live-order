# 라이브 주문/정산 (v3) — 사진은 파일 업로드 + 카톡은 복붙

## 핵심
- 관리자: 상품 등록 시 **사진 파일 업로드**
- 고객: 주문 시 **연락처/주소 입력**
- 정산서: **JPG 저장**
- 카카오톡: **자동 발송은 안 함**, 대신 “정산 링크 문구 복사”로 운영

---

## 1) 설치/실행
```bash
npm install
npm run dev
```

## 2) .env.local
프로젝트 루트에 `.env.local` 생성:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # 절대 공개 금지
ADMIN_PASSWORD=원하는비번
```

## 3) Supabase (DB)
Supabase SQL Editor에서 `supabase/schema.sql` 실행

## 4) Supabase Storage (중요: 사진 업로드)
1) Supabase 대시보드 → **Storage**
2) **New bucket** → 이름: `product-images`
3) Bucket 설정에서 **Public = ON** (공개 버킷)
   - 공개로 두면 고객 주문 화면에서 이미지가 바로 보입니다.

> 만약 Public로 하기 싫으면(보안) signed URL 설계로 바꿔야 하고 구현이 조금 더 길어집니다.

## 주요 페이지
- 고객 주문: /s/[sessionId]
- 고객 수정: /order/edit/[token]
- 정산서(JPG): /receipt/token/[token]
- 관리자 로그인: /admin/login
- 세션 관리(상품 등록/사진 업로드): /admin/session/[sessionId]
- 판매현황: /admin/session/[sessionId]/summary
