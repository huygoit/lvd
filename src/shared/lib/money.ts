const countFormat = new Intl.NumberFormat("vi-VN");
const moneyFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatCount(value: number) {
  return countFormat.format(value);
}

export function formatVnd(value: number) {
  return moneyFormat.format(value);
}

// Chuỗi ô nhập tiền: chỉ giữ chữ số, bỏ số 0 đứng đầu. Trả về rỗng khi chưa nhập.
export function digitsVnd(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
}
