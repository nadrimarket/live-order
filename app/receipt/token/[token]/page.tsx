\
"use client";

import { useEffect, useState } from "react";
import { ReceiptCard } from "@/components/ReceiptCard";
import * as htmlToImage from "html-to-image";

export default function ReceiptByToken({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loaded, setLoaded] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/receipt/by-token?token=${encodeURIComponent(token)}`);
      const j = await res.json();
      if (!res.ok) { setLoaded(true); return; }
      setReceipt(j.receipt);
      setNotice(j.notice ?? "");
      setLoaded(true);
    })();
  }, [token]);

  const downloadJpg = async () => {
    const node = document.getElementById("receipt-root");
    if (!node) return alert("정산서 영역을 찾을 수 없어요.");
    const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `정산서_${receipt?.nickname ?? "receipt"}.jpg`;
    a.click();
  };

  const copyKakaoText = async () => {
    const text =
`[정산 안내]\n${receipt.nickname}님\n총 입금: ${Number(receipt.finalTotal).toLocaleString("ko-KR")}원\n정산서 링크: ${location.origin}/receipt/token/${token}\n(위 링크에서 JPG 저장 가능)\n\n연락처: ${receipt.phone}\n주소: ${receipt.address}`;
    await navigator.clipboard.writeText(text);
    alert("카톡으로 보낼 문구를 복사했어요. 카카오톡에 붙여넣기 하시면 됩니다.");
  };

  if (!loaded) return <div className="text-slate-600">불러오는 중…</div>;
  if (!receipt) return <div className="text-slate-600">정산서를 만들 수 없어요.</div>;

  return (
    <main className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="badge">정산서</div>
          <h1 className="mt-2 text-2xl font-bold">{receipt.nickname}</h1>
          <p className="mt-1 text-slate-600">
            상품합계 {Number(receipt.goodsTotal).toLocaleString("ko-KR")}원 · 택배비 {Number(receipt.shippingFee).toLocaleString("ko-KR")}원
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button className="btnPrimary" onClick={downloadJpg}>JPG 저장</button>
          <button className="btn" onClick={copyKakaoText}>카톡문구 복사</button>
          <a className="btn" href={`/order/edit/${token}`}>주문 수정</a>
        </div>
      </header>

      <ReceiptCard receipt={receipt} notice={notice || "안내문이 비어있습니다."} />
      <div className="text-xs text-slate-500">
        ※ “카톡 자동 발송”은 카카오 알림톡/비즈 메시지 연동(유료 + 사업자/심사)이 필요합니다. 현재 버전은 <b>복사→붙여넣기</b>로 가장 빠르게 운영 가능하게 구성했습니다.
      </div>
    </main>
  );
}
