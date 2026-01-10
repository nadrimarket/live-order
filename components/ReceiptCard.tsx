"use client";

import { Receipt } from "@/lib/types";

export function ReceiptCard({ receipt, notice }: { receipt: Receipt; notice: string }) {
  return (
    <div className="card p-4 md:p-6" id="receipt-root">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr_280px]">
        <div className="flex items-stretch">
          <div className="w-full rounded-2xl border-4 border-emerald-600 p-4 text-center">
            <div className="text-xs text-slate-600">닉네임</div>
            <div className="mt-2 text-2xl font-bold">{receipt.nickname}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300">
          <div className="grid grid-cols-[1fr_88px_120px] border-b border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold">
            <div className="text-center">물품</div>
            <div className="text-center">수량</div>
            <div className="text-center">가격</div>
          </div>
          <div className="divide-y divide-slate-200">
            {receipt.lines.slice(0, 29).map((l, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_88px_120px] px-3 py-2 text-sm">
                <div className="truncate">{l.name}</div>
                <div className="text-center">{l.qty}</div>
                <div className="text-right tabular-nums">{l.amount.toLocaleString("ko-KR")}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_88px_120px] px-3 py-2 text-sm font-bold">
              <div className="text-center">총 구매 금액</div>
              <div />
              <div className="text-right tabular-nums">{receipt.goodsTotal.toLocaleString("ko-KR")}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-300">
            <div className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-center font-bold">
              총 입금 금액 (택비포함)
            </div>
            <div className="px-3 py-4 text-center">
              <div className="text-3xl font-extrabold tabular-nums">
                {receipt.finalTotal.toLocaleString("ko-KR")}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                배송: <span className="font-semibold">{receipt.shipping}</span> · 택배비{" "}
                <span className="font-semibold">{receipt.shippingFee.toLocaleString("ko-KR")}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 p-3 text-sm leading-6">
            <div className="font-semibold">배송 정보</div>
            <div className="mt-1 whitespace-pre-wrap text-slate-700">
              연락처: {receipt.phone}
              {"
"}
              주소: {receipt.address}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 p-3 text-sm whitespace-pre-wrap leading-6">
            {notice}
          </div>
        </div>
      </div>
    </div>
  );
}
