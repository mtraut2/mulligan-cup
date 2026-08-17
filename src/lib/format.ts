/** `$50` for whole dollars, `$127.50` when there are cents. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

/** `+$29.00` / `-$24.40` — always shows a sign, for net-earnings style values. */
export function formatSignedMoney(amount: number): string {
  const sign = amount < 0 ? "-" : "+";
  return `${sign}${formatMoney(Math.abs(amount))}`;
}
