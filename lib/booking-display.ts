import {
  Booking,
  CLINIC_PAYMENT_OPTIONS,
  type ClinicPaymentMethod,
  type BookingServiceItem,
} from "@/types/booking";

export type PaymentFilterValue = "all" | "none" | ClinicPaymentMethod;

export function getServiceItems(booking: Booking): Array<{ name: string; price: number }> {
  if (Array.isArray(booking.serviceItems) && booking.serviceItems.length > 0) {
    return booking.serviceItems
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        price: Number(item.price ?? 0),
      }))
      .filter((item) => item.name);
  }

  const raw = booking.procedureTypes;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return raw
      .map((item) => {
        const row = item as BookingServiceItem;
        return {
          name: String(row.name ?? "").trim(),
          price: Number(row.price ?? 0),
        };
      })
      .filter((item) => item.name);
  }

  return [];
}

export function getBookingServicesTotal(booking: Booking): number | null {
  if (booking.servicesTotal != null && booking.servicesTotal !== "") {
    const n = Number(booking.servicesTotal);
    if (Number.isFinite(n)) return n;
  }
  if (booking.totalAmount != null && booking.totalAmount !== "") {
    const n = Number(booking.totalAmount);
    if (Number.isFinite(n)) return n;
  }
  const items = getServiceItems(booking).filter((item) => item.price > 0);
  if (items.length === 0) return null;
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function getProcedureTypes(booking: Booking): string[] {
  const fromServiceItems = getServiceItems(booking).map((item) => item.name);
  if (fromServiceItems.length > 0) return fromServiceItems;

  const raw = booking.procedureTypes;
  if (Array.isArray(raw) && raw.length > 0) {
    if (typeof raw[0] === "object") {
      return raw
        .map((item) => String((item as BookingServiceItem).name ?? "").trim())
        .filter(Boolean);
    }
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  const single = booking.procedureType?.trim();
  if (!single) return [];
  return single
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getVisitTypeLabel(visitType?: string | null): string {
  if (!visitType) return "—";
  switch (visitType) {
    case "checkup":
      return "كشف";
    case "followup":
      return "إعادة";
    case "consultation":
      return "استشارة";
    default:
      return visitType;
  }
}

export function getPaymentInfo(booking: Booking): {
  method: ClinicPaymentMethod | null;
  label: string;
} {
  const labelFromApi = booking.paymentMethodLabel?.trim();
  const method = booking.paymentMethod ?? null;
  if (labelFromApi) return { method, label: labelFromApi };
  if (method) {
    const opt = CLINIC_PAYMENT_OPTIONS.find((o) => o.value === method);
    return { method, label: opt?.label ?? method };
  }
  return { method: null, label: "غير محدد" };
}

export function paymentBadgeColors(method: ClinicPaymentMethod | null): {
  bg: string;
  color: string;
  border: string;
} {
  switch (method) {
    case "cash":
      return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
    case "visa":
      return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
    case "vodafone_cash":
      return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    case "instapay":
      return { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" };
    default:
      return { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" };
  }
}

export function hasBookingSpecificTime(booking: Booking): boolean {
  if (booking.hasSpecificTime === false) return false;
  if (booking.hasSpecificTime === true) return true;
  if (booking.appointmentTime == null && booking.appointmentTime24 == null) {
    if (!booking.appointmentDate?.includes("T")) return false;
    const timePart = booking.appointmentDate.split("T")[1]?.slice(0, 5) ?? "";
    return timePart.length > 0 && timePart !== "00:00";
  }
  return true;
}

export function formatBookingTime(booking: Booking): string {
  if (!hasBookingSpecificTime(booking)) return "بدون وقت";
  const raw24 = booking.appointmentTime24;
  if (raw24) {
    const [h = "0", m = "0"] = raw24.split(":");
    const hour = Number(h);
    const minute = Number(m);
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      const period = hour >= 12 ? "م" : "ص";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
    }
  }
  const raw12 = booking.appointmentTime;
  if (raw12) return raw12;

  if (!booking.appointmentDate) return "—";
  const timePart = booking.appointmentDate.split("T")[1] ?? "";
  if (!timePart) return "—";
  const [h = "0", m = "0"] = timePart.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "—";
  const period = hour >= 12 ? "م" : "ص";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatBookingAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return Number.isFinite(num) ? num.toFixed(0) : "0";
}

function normalizeServiceCompare(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function getBookingAmountPaid(booking: Booking): number {
  return typeof booking.amountPaid === "string"
    ? parseFloat(booking.amountPaid) || 0
    : Number(booking.amountPaid ?? 0);
}

/** دخل حجز واحد — كامل المبلغ أو سعر خدمة محددة فقط */
export function getBookingIncomeForService(
  booking: Booking,
  serviceName?: string | null,
): number {
  const amountPaid = getBookingAmountPaid(booking);
  if (!serviceName || serviceName === "all") return amountPaid;

  const target = normalizeServiceCompare(serviceName);
  const pricedItems = getServiceItems(booking).filter((item) => item.price > 0);

  if (pricedItems.length > 0) {
    const match = pricedItems.find(
      (item) => normalizeServiceCompare(item.name) === target,
    );
    return match?.price ?? 0;
  }

  const procedures = getProcedureTypes(booking);
  const hasService = procedures.some(
    (name) => normalizeServiceCompare(name) === target,
  );
  if (!hasService) return 0;
  if (procedures.length === 1) return amountPaid;
  return amountPaid / procedures.length;
}

/** نسبة المدفوعات المرتبطة بخدمة محددة — لتقسيم طرق الدفع */
export function getBookingServicePaymentShare(
  booking: Booking,
  serviceName: string,
): number {
  const serviceIncome = getBookingIncomeForService(booking, serviceName);
  if (serviceIncome <= 0) return 0;

  const pricedItems = getServiceItems(booking).filter((item) => item.price > 0);
  const servicesTotal =
    getBookingServicesTotal(booking) ??
    pricedItems.reduce((sum, item) => sum + item.price, 0);

  if (servicesTotal > 0 && pricedItems.length > 0) {
    return serviceIncome / servicesTotal;
  }

  const amountPaid = getBookingAmountPaid(booking);
  if (amountPaid <= 0) return 0;
  return serviceIncome / amountPaid;
}

export function matchesPaymentFilter(
  booking: Booking,
  filter: PaymentFilterValue,
): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !booking.paymentMethod;
  return booking.paymentMethod === filter;
}

export function collectProcedureOptions(bookings: Booking[]): string[] {
  const set = new Set<string>();
  for (const b of bookings) {
    for (const p of getProcedureTypes(b)) set.add(p);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
}
