export function currentQuantity(base: number | null, deltas: Array<number | null>) {
  if (base === null) return null;
  let total = base;
  for (const value of deltas) total += value ?? 0;
  return total;
}

export function fabricationOver(contractQty: number, assigned: number, adding: number) {
  const next = assigned + adding;
  const over = next - contractQty;
  return {
    next,
    over: over > 0 ? over : 0,
    remaining: contractQty - assigned,
  };
}
