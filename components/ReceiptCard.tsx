"use client";

import type { Receipt } from "@/lib/types";

function formatCurrencyKRW(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function ReceiptCard({
  receipt,
  notice,
}: {
  receipt: Receipt;
  notice: string;
}) {
  // Receipt 타입의 실제 구조가 프로젝트마다 조금씩 달라서,
  // 안전하게 any로 캐스팅해서 화면이 깨지지 않게 렌더링합니다.
  const r: any = receipt ?? {};

  // 흔히 쓰는 필드명들(프로젝트에 맞게 자동 대응)
  const buyerName =
    r.buyerName ?? r.customerName ?? r.name ?? r.buyer?.name ?? "구매자";
  const phone = r.phone ?? r.contact ?? r.buyer?.phone ?? "";
  const address = r.address ?? r.shippingAddress ?? r.buyer?.address ?? "";

  const items: any[] = Array.isArray(r.items)
    ? r.items
    : Array.isArray(r.lines)
    ? r.lines
    : Array.isArray(r.orderItems)
    ? r.orderItems
    : [];

  // 아이템별 금액 계산(프로젝트 필드명이 달라도 최대한 대응)
  const normalizedItems = items.map((it, idx) => {
    const name =
      it.productName ??
      it.name ??
      it.title ??
      it.product?.name ??
      `상품 ${idx + 1}`;

    const qty = safeNum(it.qty ?? it.quantity ?? it.count ?? 1) || 1;

    const unitPrice = safeNum(
      it.unitPrice ?? it.price ?? it.unit_price ?? it.product?.price ?? 0
    );

    // amount/lineTotal이 있으면 우선 사용, 없으면 unitPrice*qty
    const amount = safeNum(it.amount ?? it.lineTotal ?? it.total ?? unitPrice * qty);

    return { name, qty, unitPrice, amount };
  });

  const subtotalFromItems = normalizedItems.reduce(
    (sum, it) => sum + safeNum(it.amount),
    0
  );

  const subtotal =
    safeNum(r.subtotal ?? r.totalBeforeShipping ?? r.sum) || subtotalFromItems;

  // 배송비: 프로젝트에 값이 있으면 사용, 없으면 "10만원 미만 3,500원" 규칙 적용
  const shippingFromData = safeNum(r.shippingFee ?? r.shipping ?? r.deliveryFee);
  const shipping =
    shippingFromData ||
    (subtotal > 0 && subtotal < 100000 ? 3500 : 0);

  const total =
    safeNum(r.total ?? r.grandTotal ?? r.payTotal) || subtotal + shipping;

  const createdAt =
    r.createdAt ?? r.created_at ?? r.date ?? r.orderedAt ?? "";

  return (
    <div
      id="receipt-root"
      className="mx-auto w-full max-w-[980px] rounded-2xl bg-white p-5 shadow-sm md:p-7"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-gray-500">정산서</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
            주문/구매 정산 내역
          </div>
          {createdAt ? (
            <div className="mt-1 text-sm text-gray-500">생성일: {String(createdAt)}</div>
          ) : null}
        </div>

        <div className="rounded-2xl border-4 border-emerald-600 px-5 py-4 text-center">
          <div className="text-sm font-semibold text-emerald-700">총 결제금액</div>
          <div className="mt-1 text-3xl font-extrabold text-gray-900">
            {formatCurrencyKRW(total)}원
          </div>
          <div className="mt-1 text-xs text-gray-500">
            (10만원 미만 시 배송비 3,500원 포함)
          </div>
        </div>
      </div>

      {/* Buyer */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold text-gray-800">구매자</div>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">이름</span>{" "}
              <span className="font-semibold text-gray-900">{buyerName}</span>
            </div>
            {phone ? (
              <div>
                <span className="text-gray-500">연락처</span>{" "}
                <span className="font-semibold text-gray-900">{phone}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold text-gray-800">배송지</div>
          <div className="mt-2 text-sm text-gray-700">
            {address ? (
              <div className="whitespace-pre-wrap leading-relaxed">{address}</div>
            ) : (
              <div className="text-gray-400">입력된 주소가 없습니다.</div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mt-6 rounded-2xl border">
        <div className="border-b px-4 py-3 text-sm font-semibold text-gray-800">
          구매 물품
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">물품</th>
                <th className="px-4 py-3 font-semibold">단가</th>
                <th className="px-4 py-3 font-semibold">수량</th>
                <th className="px-4 py-3 text-right font-semibold">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {normalizedItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-400" colSpan={4}>
                    구매한 물품이 없습니다.
                  </td>
                </tr>
              ) : (
                normalizedItems.map((it, i) => (
                  <tr key={i} className="text-gray-800">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{it.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrencyKRW(it.unitPrice)}원
                    </td>
                    <td className="px-4 py-3">{it.qty}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">
                      {formatCurrencyKRW(it.amount)}원
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold text-gray-800">안내</div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {notice?.trim()
              ? notice
              : "정산 관련 안내 문구를 입력하세요. (관리자가 수정 가능)"}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">상품 합계</span>
              <span className="font-semibold text-gray-900">
                {formatCurrencyKRW(subtotal)}원
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">배송비</span>
              <span className="font-semibold text-gray-900">
                {formatCurrencyKRW(shipping)}원
              </span>
            </div>

            <div className="my-2 border-t pt-3" />

            <div className="flex items-center justify-between">
              <span className="text-gray-700">총 결제금액</span>
              <span className="text-xl font-extrabold text-gray-900">
                {formatCurrencyKRW(total)}원
              </span>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              ※ 총액이 100,000원 미만이면 배송비 3,500원이 자동 포함됩니다.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-400">
        © 정산서 자동 생성 시스템
      </div>
    </div>
  );
}
