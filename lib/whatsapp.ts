/**
 * يبني رابط wa.me من رقم الهاتف (أرقام مصر المحلية 01… → 20…).
 * أرقام تحتوي كود دولة واضح تُمرَّر كما هي بعد إزالة غير الأرقام.
 */
export function whatsappChatUrlFromPhone(
  raw: string | null | undefined,
): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;

  if (d.startsWith("00")) d = d.slice(2);

  if (d.startsWith("20") && d.length >= 11) {
    return `https://wa.me/${d}`;
  }

  if (d.startsWith("0") && d.length >= 10 && d.length <= 11) {
    return `https://wa.me/20${d.slice(1)}`;
  }

  if (d.length === 10 && d.startsWith("1")) {
    return `https://wa.me/20${d}`;
  }

  if (d.length >= 8 && d.length <= 15) {
    return `https://wa.me/${d}`;
  }

  return null;
}
