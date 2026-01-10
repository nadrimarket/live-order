export type ShippingType = "일반" | "제주/도서" | "픽업";

export type Product = {
  id: string;
  session_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Session = {
  id: string;
  title: string;
  is_closed: boolean;
  ship_threshold: number;
  ship_fee_normal: number;
  ship_fee_jeju: number;
  created_at: string;
};

export type ReceiptLine = { name: string; qty: number; amount: number };

export type Receipt = {
  sessionId: string;
  nickname: string;
  shipping: ShippingType;
  phone: string;
  address: string;
  goodsTotal: number;
  shippingFee: number;
  finalTotal: number;
  lines: ReceiptLine[];
};
