"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    daum?: any;
  }
}

type Props = {
  shipping: string;
  postal: string;
  addr1: string;
  addr2: string;
  onChange: (next: { postal: string; addr1: string; addr2: string }) => void;
};

export default function AddressField({
  shipping,
  postal,
  addr1,
  addr2,
  onChange,
}: Props) {
  useEffect(() => {
    const id = "daum-postcode-script";
    if (document.getElementById(id)) return;

    const script = document.createElement("script");
    script.id = id;
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const disabled = shipping === "픽업";

  function openPostcode() {
    if (disabled) return;
    if (!window.daum?.Postcode) {
      alert("주소 검색 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: any) => {
        onChange({
          postal: data.zonecode ?? "",
          addr1: data.address ?? "",
          addr2: "",
        });
        setTimeout(() => {
          const el = document.getElementById("addr2") as HTMLInputElement | null;
          el?.focus();
        }, 0);
      },
    }).open();
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div>
        <label className="text-sm font-semibold">우편번호</label>
        <div className="mt-1 flex gap-2">
          <input
            className="input flex-1"
            value={postal}
            readOnly
            placeholder={disabled ? "픽업은 주소 불필요" : "우편번호"}
          />
          <button
            type="button"
            className="btn"
            onClick={openPostcode}
            disabled={disabled}
          >
            주소찾기
          </button>
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="text-sm font-semibold">주소</label>
        <input
          className="input mt-1"
          value={addr1}
          readOnly
          placeholder={disabled ? "픽업은 주소 불필요" : "주소찾기를 눌러 선택"}
        />
      </div>

      <div className="md:col-span-3">
        <label className="text-sm font-semibold">상세주소</label>
        <input
          id="addr2"
          className="input mt-1"
          value={addr2}
          onChange={(e) =>
            onChange({ postal, addr1, addr2: e.target.value })
          }
          placeholder={disabled ? "픽업은 주소 불필요" : "동/호수, 공동현관 비번 등"}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
