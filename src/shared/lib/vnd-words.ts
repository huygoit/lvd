const DIGIT = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALE = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function readBlock(value: number, full: boolean) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const one = value % 10;
  const parts: string[] = [];
  if (hundred > 0) parts.push(`${DIGIT[hundred]} trăm`);
  else if (full && (ten > 0 || one > 0)) parts.push("không trăm");
  if (ten > 1) {
    parts.push(`${DIGIT[ten]} mươi`);
    if (one === 1) parts.push("mốt");
    else if (one === 5) parts.push("lăm");
    else if (one > 0) parts.push(DIGIT[one]);
  } else if (ten === 1) {
    parts.push("mười");
    if (one === 5) parts.push("lăm");
    else if (one > 0) parts.push(DIGIT[one]);
  } else if (one > 0) {
    if (hundred > 0 || full) parts.push("lẻ");
    parts.push(DIGIT[one]);
  }
  return parts.join(" ");
}

export function readVnd(amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("Số tiền không đọc được.");
  if (amount === 0) return "Không đồng chẵn";
  const raw: number[] = [];
  let rest = amount;
  while (rest > 0) {
    raw.push(rest % 1000);
    rest = Math.floor(rest / 1000);
    if (raw.length > SCALE.length) throw new Error("Số tiền vượt quá phạm vi đọc được.");
  }
  const blocks: string[] = [];
  for (let index = raw.length - 1; index >= 0; index -= 1) {
    if (raw[index] === 0) continue;
    const words = readBlock(raw[index], index < raw.length - 1);
    blocks.push(SCALE[index] ? `${words} ${SCALE[index]}` : words);
  }
  const sentence = blocks.join(" ");
  return `${sentence.charAt(0).toLocaleUpperCase("vi")}${sentence.slice(1)} đồng chẵn`;
}
