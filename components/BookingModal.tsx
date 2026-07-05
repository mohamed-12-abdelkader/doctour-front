"use client";

import {
  Dialog,
  Button,
  Input,
  Text,
  VStack,
  Flex,
  Box,
  Portal,
  Field,
  SimpleGrid,
  Heading,
  Switch,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo, useRef, useCallback, type CSSProperties } from "react";
import { Plus, CalendarPlus, User, Phone, Stethoscope, Clock, CreditCard } from "lucide-react";
import {
  Booking,
  CLINIC_PAYMENT_OPTIONS,
  type ClinicPaymentMethod,
  type BookingServiceItem,
} from "@/types/booking";
import type { ClinicService } from "@/types/clinic-service";
import api from "@/lib/axios";
import { hasBookingSpecificTime } from "@/lib/booking-display";
import { getCurrentDoctorId } from "@/lib/doctor-context";
import { BOOKING_SERVICES } from "@/data/services";
import { toaster } from "@/components/ui/toaster";

/** عميل سابق من الحجوزات — لاقتراحات الاسم */
export interface KnownCustomerHint {
  customerName: string;
  customerPhone: string;
  visitType?: string | null;
  doctorId?: number | null;
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveDefaultDoctorId(
  doctors: Array<{ id: number }>,
  preferredId: number,
): number {
  const ids = doctors.map((d) => Number(d.id)).filter((id) => id > 0);
  if (ids.length === 0) return preferredId > 0 ? preferredId : 0;
  if (preferredId > 0 && ids.includes(preferredId)) return preferredId;
  const stored = getCurrentDoctorId();
  if (stored && ids.includes(stored)) return stored;
  return ids[0];
}

function hintsFromBookings(bookings: Booking[]): KnownCustomerHint[] {
  const map = new Map<string, KnownCustomerHint>();
  for (const b of bookings) {
    const name = (b.customerName || "").trim();
    if (!name) continue;
    const phone = (b.customerPhone || "").trim();
    const digits = phone.replace(/\D/g, "");
    const key = digits.length >= 8 ? `p:${digits}` : `n:${name.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        customerName: name,
        customerPhone: phone,
        visitType: typeof b.visitType === "string" ? b.visitType : null,
        doctorId: b.doctorId != null ? Number(b.doctorId) : null,
      });
    }
  }
  return Array.from(map.values());
}

/** تحويل قيمة الـ API للعرض في الواجهة */
function parseApiVisitTypeToUi(apiValue: string): string {
  const t = apiValue.trim();
  if (!t) return BOOKING_SERVICES[0] ?? "كشف";
  const lower = t.toLowerCase();
  if (lower === "followup" || t === "إعادة") return "متابعة";
  if (lower === "checkup") return "كشف";
  if (BOOKING_SERVICES.includes(t)) return t;
  const match = BOOKING_SERVICES.find((s) => s.toLowerCase() === lower);
  return match ?? t;
}

/** تحويل اختيار الواجهة لقيمة تُرسل في body الـ API */
function mapVisitTypeForApi(uiLabel: string): string {
  const t = uiLabel.trim();
  if (t === "متابعة" || t.toLowerCase() === "followup") return "إعادة";
  return t;
}

function parseVisitTypesFromInitial(vt: unknown): string[] {
  if (vt == null || vt === "") return [BOOKING_SERVICES[0] ?? "كشف"];
  if (Array.isArray(vt)) {
    const parts = vt.map((item) =>
      typeof item === "object" && item && "name" in item
        ? String((item as BookingServiceItem).name ?? "")
        : String(item),
    );
    const ui = parts.map(parseApiVisitTypeToUi);
    const unique = [...new Set(ui.filter(Boolean))];
    return unique.length > 0 ? unique : [BOOKING_SERVICES[0] ?? "كشف"];
  }
  const parts = String(vt)
        .split(/[,،|]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const ui = parts.map(parseApiVisitTypeToUi);
  const unique = [...new Set(ui)];
  return unique.length > 0 ? unique : [BOOKING_SERVICES[0] ?? "كشف"];
}

/** أرقام صحيحة فقط — 100 وليس 0100 */
function sanitizeAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n >= 0 ? String(n) : "";
}

function parseAmountPaid(raw: string): number | null {
  const s = sanitizeAmountInput(raw);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type SelectedServiceRow = {
  name: string;
  price: string;
};

function parseServiceItemsFromBooking(booking: Booking): SelectedServiceRow[] {
  if (Array.isArray(booking.serviceItems) && booking.serviceItems.length > 0) {
    return booking.serviceItems.map((item) => ({
      name: parseApiVisitTypeToUi(String(item.name ?? "")),
      price: sanitizeAmountInput(String(item.price ?? "")) || "0",
    }));
  }

  const rawProcedureTypes = booking.procedureTypes;
  if (
    Array.isArray(rawProcedureTypes) &&
    rawProcedureTypes.length > 0 &&
    typeof rawProcedureTypes[0] === "object"
  ) {
    return rawProcedureTypes.map((item) => {
      const row = item as BookingServiceItem;
      return {
        name: parseApiVisitTypeToUi(String(row.name ?? "")),
        price: sanitizeAmountInput(String(row.price ?? "")) || "0",
      };
    });
  }

  const types = parseVisitTypesFromInitial(
    rawProcedureTypes ?? booking.procedureType ?? booking.visitType,
  );
  const totalRaw =
    booking.servicesTotal ?? booking.totalAmount ?? booking.amountPaid ?? 0;
  const total =
    typeof totalRaw === "string" ? parseFloat(totalRaw) || 0 : Number(totalRaw) || 0;

  if (types.length === 1 && total > 0) {
    return [{ name: types[0], price: String(Math.round(total)) }];
  }

  return types.map((name) => ({ name, price: "" }));
}

function isServiceLabelAsName(name: string, serviceLabels: string[]): boolean {
  const n = name.trim().toLowerCase();
  return serviceLabels.some((s) => s.toLowerCase() === n);
}

function normalizeClinicServiceNames(payload: unknown): string[] {
  const raw = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { services?: unknown }).services)
      ? (payload as { services: unknown[] }).services
      : [];
  const names = raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "name" in item) {
        return String((item as ClinicService).name ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
  return [...new Set(names)];
}

/** توحيد أسماء الخدمات للعرض — «إعادة» و«followup» تُعرض كـ «متابعة» مرة واحدة */
function buildUniqueServiceOptions(rawNames: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawNames) {
    const label = parseApiVisitTypeToUi(String(raw ?? "").trim());
    if (!label) continue;
    const key = label.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function validateEgyptPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return "رقم الهاتف يجب أن يكون 10 أو 11 رقمًا";
  }
  if (!digits.startsWith("01")) {
    return "رقم الهاتف المصري يبدأ بـ 01";
  }
  return null;
}

function normalizePaymentMethod(value: string | null | undefined): ClinicPaymentMethod {
  const t = (value ?? "").trim();
  const aliases: Record<string, ClinicPaymentMethod> = {
    cash: "cash",
    نقدي: "cash",
    visa: "visa",
    فيزا: "visa",
    vodafone_cash: "vodafone_cash",
    "فودافون كاش": "vodafone_cash",
    instapay: "instapay",
    "انستا باي": "instapay",
  };
  return aliases[t] ?? aliases[t.toLowerCase()] ?? "cash";
}

type FormErrors = Partial<
  Record<
    | "name"
    | "phone"
    | "age"
    | "doctorId"
    | "date"
    | "time"
    | "amountPaid"
    | "paymentMethod"
    | "transferFromPhone"
    | "visitType"
    | "services",
    string
  >
>;

type PaymentRow = {
  method: ClinicPaymentMethod;
  amount: string;
  transferFromPhone?: string;
};

function needsTransferFromPhone(method: ClinicPaymentMethod): boolean {
  return method === "vodafone_cash" || method === "instapay";
}

function mergeKnownCustomerHints(
  a: KnownCustomerHint[],
  b: KnownCustomerHint[],
): KnownCustomerHint[] {
  const map = new Map<string, KnownCustomerHint>();
  for (const c of [...a, ...b]) {
    const name = (c.customerName || "").trim();
    if (!name) continue;
    const phone = (c.customerPhone || "").trim();
    const digits = phone.replace(/\D/g, "");
    const key = digits.length >= 8 ? `p:${digits}` : `n:${name.toLowerCase()}`;
    if (!map.has(key)) map.set(key, c);
  }
  return Array.from(map.values());
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: any) => void | Promise<void>;
  initialData?: Booking | null;
  doctorId?: number | null;
  /** عند فتح حجز جديد: تفعيل «بدون وقت» افتراضيًا */
  defaultNoTime?: boolean;
  /** تاريخ افتراضي (YYYY-MM-DD) — مثلاً اليوم المعروض في الصفحة */
  defaultDate?: string;
  /** اختياري: يُدمج مع نتيجة GET /bookings/all (سنة سابقة) داخل المودال */
  knownCustomers?: KnownCustomerHint[];
}

export default function BookingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  doctorId,
  defaultNoTime = false,
  defaultDate,
  knownCustomers = [],
}: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ClinicPaymentMethod>("cash");
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
    { method: "cash", amount: "" },
  ]);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceRow[]>([
    { name: BOOKING_SERVICES[0] ?? "كشف", price: "" },
  ]);
  const [availableServices, setAvailableServices] = useState<string[]>(() =>
    buildUniqueServiceOptions(BOOKING_SERVICES),
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: number; name?: string; user?: { name?: string } }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(0);
  const [nameFocused, setNameFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiKnownCustomers, setApiKnownCustomers] = useState<KnownCustomerHint[]>(
    [],
  );
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const doctorAutoSetRef = useRef(false);

  const isNewBooking = !initialData;
  const inputStyles = {
    bg: "gray.50" as const,
    borderColor: "gray.200" as const,
    minH: { base: "48px", sm: "44px" },
    _focus: { borderColor: "#615b36", bg: "white", boxShadow: "0 0 0 1px #615b36" },
  };
  const selectStyle = (hasError?: boolean): CSSProperties => ({
    width: "100%",
    padding: "0.75rem 0.625rem",
    borderRadius: "0.5rem",
    border: `1px solid ${hasError ? "#FC8181" : "#E2E8F0"}`,
    backgroundColor: "#F7FAFC",
    fontSize: "1rem",
    outline: "none",
    minHeight: "48px",
  });

  const mergedKnownCustomers = useMemo(
    () => mergeKnownCustomerHints(knownCustomers, apiKnownCustomers),
    [knownCustomers, apiKnownCustomers],
  );

  const nameSuggestions = useMemo(() => {
    if (initialData || !mergedKnownCustomers.length) return [];
    const q = name.trim();
    if (q.length < 1) return [];
    const qLower = q.toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const out: KnownCustomerHint[] = [];
    const seen = new Set<string>();
    for (const c of mergedKnownCustomers) {
      const n = (c.customerName || "").trim();
      const p = (c.customerPhone || "").trim();
      const pDigits = p.replace(/\D/g, "");
      const nameMatch = n.toLowerCase().includes(qLower);
      const phoneMatch =
        qDigits.length >= 2 && pDigits.length > 0 && pDigits.includes(qDigits);
      if (!nameMatch && !phoneMatch) continue;
      const key = pDigits.length >= 6 ? `p:${pDigits}` : `n:${n.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        customerName: n,
        customerPhone: p,
        visitType: c.visitType,
        doctorId: c.doctorId,
      });
      if (out.length >= 10) break;
    }
    return out;
  }, [name, mergedKnownCustomers, initialData]);

  const showSuggestionList =
    !initialData && nameFocused && nameSuggestions.length > 0;

  const servicesTotal = useMemo(
    () =>
      selectedServices.reduce(
        (sum, row) => sum + (parseAmountPaid(row.price) ?? 0),
        0,
      ),
    [selectedServices],
  );

  const totalPaymentAmount = useMemo(
    () =>
      paymentRows.reduce((sum, row) => sum + (parseAmountPaid(row.amount) ?? 0), 0),
    [paymentRows],
  );

  const toggleService = (service: string) => {
    const label = parseApiVisitTypeToUi(service);
    setSelectedServices((prev) => {
      if (prev.some((row) => row.name === label)) {
        if (prev.length <= 1) return prev;
        return prev.filter((row) => row.name !== label);
      }
      return [...prev, { name: label, price: "" }];
    });
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.visitType;
      delete next.services;
      return next;
    });
  };

  const updateServicePrice = (serviceName: string, price: string) => {
    setSelectedServices((prev) =>
      prev.map((row) =>
        row.name === serviceName ? { ...row, price: sanitizeAmountInput(price) } : row,
      ),
    );
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.services;
      delete next.amountPaid;
      return next;
    });
  };

  const toggleVisitType = (service: string) => {
    toggleService(service);
  };

  const applyCustomerHint = (c: KnownCustomerHint) => {
    setName(c.customerName);
    setPhone(c.customerPhone || "");
    if (c.visitType) {
      setSelectedServices(
        parseVisitTypesFromInitial(c.visitType).map((name) => ({ name, price: "" })),
      );
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      delete next.phone;
      delete next.visitType;
      return next;
    });
    const docId = Number(c.doctorId ?? 0);
    const doctorInList =
      docId > 0 && doctors.some((d) => Number(d.id) === docId);
    if (doctorInList && docId !== selectedDoctorId) {
      // طبيب مختلف — useEffect سيعيد جلب المواعيد تلقائيًا
      setSelectedDoctorId(docId);
      setTime("");
    }
    // نفس الطبيب: لا نمسح availableSlots — كان بيُفرغ القائمة بدون إعادة جلب
  };

  const formatSlotTo12Hour = (slot: string) => {
    const [hoursPart = "0", minutesPart = "0"] = slot.split(":");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return slot;

    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minutesPadded = String(minutes).padStart(2, "0");

    return `${hour12}:${minutesPadded} ${period}`;
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.customerName || "");
        setPhone(initialData.customerPhone || "");
        setAge(
          initialData.age != null && Number.isFinite(Number(initialData.age))
            ? String(initialData.age)
            : "",
        );
        setSelectedServices(parseServiceItemsFromBooking(initialData));

        const amountRaw =
          typeof initialData.amountPaid === "string"
            ? initialData.amountPaid
            : initialData.amountPaid?.toString() ?? "";
        setAmountPaid(sanitizeAmountInput(amountRaw) || "0");
        setPaymentMethod(
          normalizePaymentMethod((initialData as { paymentMethod?: string }).paymentMethod),
        );
        const existingPayments =
          (initialData as { paymentDetails?: unknown }).paymentDetails ??
          (initialData as { payments?: unknown }).payments;
        if (Array.isArray(existingPayments) && existingPayments.length > 0) {
          const rows = existingPayments
            .map((p) => {
              const row = p as {
                method?: string;
                amount?: unknown;
                transferFromPhone?: unknown;
              };
              const amount = sanitizeAmountInput(String(row.amount ?? ""));
              if (!amount) return null;
              return {
                method: normalizePaymentMethod(row.method),
                amount,
                transferFromPhone:
                  typeof row.transferFromPhone === "string"
                    ? row.transferFromPhone
                    : "",
              };
            })
            .filter(Boolean) as PaymentRow[];
          setPaymentRows(
            rows.length > 0
              ? rows
              : [
                  {
                    method: normalizePaymentMethod(
                      (initialData as { paymentMethod?: string }).paymentMethod,
                    ),
                    amount: sanitizeAmountInput(amountRaw) || "0",
                    transferFromPhone:
                      typeof (initialData as { transferFromPhone?: unknown })
                        .transferFromPhone === "string"
                        ? (initialData as { transferFromPhone: string })
                            .transferFromPhone
                        : "",
                  },
                ],
          );
        } else {
          setPaymentRows([
            {
              method: normalizePaymentMethod(
                (initialData as { paymentMethod?: string }).paymentMethod,
              ),
              amount: sanitizeAmountInput(amountRaw) || "0",
              transferFromPhone:
                typeof (initialData as { transferFromPhone?: unknown })
                  .transferFromPhone === "string"
                  ? (initialData as { transferFromPhone: string }).transferFromPhone
                  : "",
            },
          ]);
        }
        setSelectedDoctorId(
          Number((initialData as any).doctorId ?? doctorId ?? 0),
        );

        const appointmentDateTime = initialData.appointmentDate || "";

        if (appointmentDateTime && appointmentDateTime.includes("T")) {
          const [rawDate = "", rawTime = ""] = appointmentDateTime.split("T");
          const timeFromIso = rawTime.slice(0, 5);
          setDate(rawDate || defaultDate || formatDateLocal(new Date()));
          setTime(timeFromIso || "");
        } else {
          setDate(
            appointmentDateTime?.slice(0, 10) ||
              defaultDate ||
              formatDateLocal(new Date()),
          );
          setTime("");
        }
        setNoTime(!hasBookingSpecificTime(initialData));
      } else {
        // Reset for new entry
        setName("");
        setPhone("");
        setAge("");
        setDate(defaultDate || formatDateLocal(new Date()));
        setTime("");
        setNoTime(defaultNoTime);
        setAmountPaid("");
        setPaymentMethod("cash");
        setPaymentRows([{ method: "cash", amount: "" }]);
        setSelectedServices([{ name: BOOKING_SERVICES[0] ?? "كشف", price: "" }]);
        setAvailableSlots([]);
        const preferred =
          Number(doctorId ?? 0) || getCurrentDoctorId() || 0;
        setSelectedDoctorId(preferred);
        doctorAutoSetRef.current = false;
      }
      setFormErrors({});
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }, [isOpen, initialData, doctorId, defaultNoTime, defaultDate]);

  /** بعد تحميل قائمة الأطباء: اختيار الطبيب الافتراضي تلقائيًا */
  useEffect(() => {
    if (!isOpen) {
      doctorAutoSetRef.current = false;
      return;
    }
    if (initialData || doctors.length === 0) return;
    if (doctorAutoSetRef.current) return;
    const preferred = Number(doctorId ?? 0) || getCurrentDoctorId() || 0;
    const resolved = resolveDefaultDoctorId(doctors, preferred);
    if (resolved > 0) {
      setSelectedDoctorId(resolved);
      doctorAutoSetRef.current = true;
    }
  }, [isOpen, initialData, doctors, doctorId]);

  /** اقتراحات من أرشيف الحجوزات (سنة) — نفس مسار today-bookings */
  useEffect(() => {
    if (!isOpen || initialData) {
      setApiKnownCustomers([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      const params: Record<string, string | number> = {
        startDate: formatDateLocal(start),
        endDate: formatDateLocal(end),
      };
      const docId = Number(doctorId ?? 0);
      if (!Number.isNaN(docId) && docId > 0) params.doctorId = docId;
      try {
        const res = await api.get("/bookings/all", { params });
        const data = res.data;
        const list: Booking[] = Array.isArray(data)
          ? data
          : (data?.bookings ?? []);
        if (cancelled) return;
        setApiKnownCustomers(hintsFromBookings(list));
      } catch {
        if (!cancelled) setApiKnownCustomers([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialData, doctorId]);

  useEffect(() => {
    if (!isOpen) return;
    const loadDoctors = async () => {
      try {
        const res = await api.get("/doctors");
        const list = Array.isArray(res.data) ? res.data : (res.data?.doctors ?? []);
        setDoctors(Array.isArray(list) ? list : []);
      } catch {
        setDoctors([]);
      }
    };
    loadDoctors();
  }, [isOpen]);

  // Fetch available slots when date or doctor changes
  useEffect(() => {
    if (!isOpen || !date || !selectedDoctorId || noTime) {
      setAvailableSlots([]);
      return;
    }

    let cancelled = false;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      try {
        const res = await api.get("/bookings/available-slots", {
          params: { date, doctorId: selectedDoctorId },
        });
        if (cancelled) return;
        const slots =
          res.data?.available_slots ?? res.data?.availableSlots ?? [];
        setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch {
        if (!cancelled) setAvailableSlots([]);
      } finally {
        if (!cancelled) setIsLoadingSlots(false);
      }
    };
    void fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [isOpen, date, selectedDoctorId, noTime]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void api
      .get("/clinic-services")
      .then((res) => {
        if (cancelled) return;
        const names = normalizeClinicServiceNames(res.data);
        setAvailableServices(
          buildUniqueServiceOptions(names.length > 0 ? names : BOOKING_SERVICES),
        );
      })
      .catch(() => {
        if (!cancelled) setAvailableServices(buildUniqueServiceOptions(BOOKING_SERVICES));
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setNameFocused(false);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {};
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      errors.name = "اسم العميل مطلوب (حرفان على الأقل)";
    } else if (isServiceLabelAsName(trimmedName, availableServices)) {
      errors.name = "أدخل اسم العميل وليس نوع الخدمة (مثل: كشف)";
    } else if (/^\d+$/.test(trimmedName.replace(/\s/g, ""))) {
      errors.name = "الاسم لا يمكن أن يكون أرقامًا فقط";
    }

    const phoneErr = validateEgyptPhone(phone);
    if (phoneErr) errors.phone = phoneErr;

    if (age.trim()) {
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge <= 0 || parsedAge > 130) {
        errors.age = "أدخل سن صحيح";
      }
    }

    if (isNewBooking) {
      if (!selectedDoctorId) errors.doctorId = "يرجى اختيار الطبيب";

      if (!date) {
        errors.date = "يرجى اختيار تاريخ الحجز";
      } else {
        const today = formatDateLocal(new Date());
        if (date < today) errors.date = "لا يمكن اختيار تاريخ في الماضي";
      }

      if (!noTime) {
        if (!time) {
          errors.time = "يرجى اختيار وقت من المواعيد المتاحة";
        } else if (
          availableSlots.length > 0 &&
          !availableSlots.includes(time)
        ) {
          errors.time = "الوقت المختار غير متاح — اختر من القائمة";
        }
      }
    }

    const paymentMethods = new Set<ClinicPaymentMethod>();
    for (const row of paymentRows) {
      const amount = parseAmountPaid(row.amount);
      if (amount === null || amount <= 0) {
        errors.amountPaid = "أدخل مبلغًا صحيحًا لكل طريقة دفع";
        break;
      }
      if (paymentMethods.has(row.method)) {
        errors.paymentMethod = "لا تكرر نفس طريقة الدفع أكثر من مرة";
        break;
      }
      if (needsTransferFromPhone(row.method)) {
        const transferErr = validateEgyptPhone(row.transferFromPhone ?? "");
        if (transferErr) {
          errors.transferFromPhone = `أدخل رقم التحويل الصحيح لطريقة ${
            CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === row.method)
              ?.label ?? "الدفع"
          }`;
          break;
        }
      }
      paymentMethods.add(row.method);
    }
    if (paymentRows.length === 0 || totalPaymentAmount <= 0) {
      errors.amountPaid = "أدخل مبلغًا واحدًا على الأقل";
    }

    if (selectedServices.length === 0) {
      errors.visitType = "اختر خدمة واحدة على الأقل";
    } else {
      for (const row of selectedServices) {
        const price = parseAmountPaid(row.price);
        if (price === null || price <= 0) {
          errors.services = "أدخل سعرًا صحيحًا لكل خدمة مختارة";
          break;
        }
      }
    }

    if (servicesTotal > 0 && totalPaymentAmount > servicesTotal) {
      errors.amountPaid = "المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الخدمات";
    }

    return errors;
  }, [
    name,
    phone,
    age,
    selectedDoctorId,
    date,
    time,
    noTime,
    paymentRows,
    totalPaymentAmount,
    selectedServices,
    servicesTotal,
    availableServices,
    availableSlots,
    isNewBooking,
  ]);

  const updatePaymentRow = (
    index: number,
    patch: Partial<PaymentRow>,
  ) => {
    setPaymentRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.amountPaid;
      delete next.paymentMethod;
      delete next.transferFromPhone;
      return next;
    });
  };

  const togglePaymentMethod = (method: ClinicPaymentMethod) => {
    setPaymentRows((prev) => {
      if (prev.some((row) => row.method === method)) {
        if (prev.length <= 1) return prev;
        return prev.filter((row) => row.method !== method);
      }
      return [...prev, { method, amount: "", transferFromPhone: "" }];
    });
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.amountPaid;
      delete next.paymentMethod;
      delete next.transferFromPhone;
      return next;
    });
  };

  const handleSave = async () => {
    if (submitLockRef.current || isSubmitting) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const first = Object.values(errors)[0];
      toaster.create({
        title: "تحقق من البيانات",
        description: first,
        type: "warning",
        duration: 3500,
      });
      return;
    }

    const payments = paymentRows
      .map((row) => {
        const transferFromPhone = (row.transferFromPhone ?? "").replace(/\D/g, "");
        return {
          method: row.method,
          amount: parseAmountPaid(row.amount) ?? 0,
          ...(needsTransferFromPhone(row.method) && transferFromPhone
            ? { transferFromPhone }
            : {}),
        };
      })
      .filter((row) => row.amount > 0);
    const amount = payments.reduce((sum, row) => sum + row.amount, 0);
    const parsedAge = age.trim() ? Number(age) : null;
    const services: BookingServiceItem[] = selectedServices.map((row) => ({
      name: mapVisitTypeForApi(row.name),
      price: parseAmountPaid(row.price) ?? 0,
    }));
    const visitTypesForApi = services.map((row) => row.name);
    const singlePayment = payments.length === 1 ? payments[0] : null;
    const bookingData: Record<string, unknown> = {
      name: name.trim(),
      phone: phone.replace(/\D/g, ""),
      amountPaid: amount,
      services,
      paymentDetails: payments,
      paymentMethod: singlePayment?.method ?? payments[0]?.method ?? paymentMethod,
      procedureTypes: visitTypesForApi,
      visitTypes: visitTypesForApi,
    };
    if (singlePayment?.transferFromPhone) {
      bookingData.transferFromPhone = singlePayment.transferFromPhone;
    }
    if (payments.length > 1) {
      bookingData.payments = payments;
    }
    if (parsedAge != null && Number.isFinite(parsedAge)) {
      bookingData.age = parsedAge;
    }
    if (isNewBooking) {
      bookingData.date = date;
      bookingData.doctorId = selectedDoctorId;
      if (noTime) {
        bookingData.noTime = true;
      } else {
        bookingData.time = time;
      }
    }
    if (initialData) {
      bookingData.visitType =
        visitTypesForApi.length === 1
          ? visitTypesForApi[0]
          : visitTypesForApi.join("، ");
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setFormErrors({});

    try {
      await Promise.resolve(onSave(bookingData));
    } catch {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open && !isSubmitting) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop
          bg="blackAlpha.600"
          backdropFilter="blur(4px)"
          zIndex="1400"
          position="fixed"
          inset="0"
        />
        <Dialog.Positioner
          zIndex="1401"
          position="fixed"
          inset="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          padding={{ base: 2, sm: 4 }}
        >
          <Dialog.Content
            dir="rtl"
            bg="white"
            borderRadius={{ base: "xl", md: "2xl" }}
            overflow="hidden"
            boxShadow="2xl"
            width={{ base: "100%", sm: "95%", md: "720px", lg: "760px" }}
            maxW="calc(100vw - 16px)"
            maxH={{ base: "95vh", sm: "92vh" }}
            outline="none"
            display="flex"
            flexDirection="column"
          >
            <Box
              bg="linear-gradient(135deg, #615b36 0%, #7a7350 100%)"
              px={{ base: 5, md: 7 }}
              py={{ base: 4, md: 5 }}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexShrink={0}
            >
              <Flex align="center" gap={3} minW={0}>
                <Box
                  p={2.5}
                  bg="whiteAlpha.200"
                  borderRadius="xl"
                  color="white"
                  flexShrink={0}
                >
                  {isNewBooking ? <Plus size={22} /> : <CalendarPlus size={22} />}
                </Box>
                <Box minW={0}>
                  <Heading size="lg" color="white" fontWeight="bold" lineHeight="short">
                    {isNewBooking ? "إضافة حجز جديد" : "تعديل الحجز"}
                  </Heading>
                  {isNewBooking && (
                    <Text fontSize="sm" color="whiteAlpha.900" mt={1}>
                      أدخل بيانات العميل واختر الموعد المتاح
                    </Text>
                  )}
                </Box>
              </Flex>
              <Dialog.CloseTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: "whiteAlpha.200" }}
                  rounded="full"
                  w={9}
                  h={9}
                  minW={0}
                  p={0}
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  ✕
                </Button>
              </Dialog.CloseTrigger>
            </Box>

            <Box
              p={{ base: 5, md: 7 }}
              overflowY="auto"
              flex={1}
              minH={0}
              bg="gray.50"
            >
              <VStack gap={{ base: 4, md: 5 }} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={3}>
                    بيانات العميل
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 4, md: 5 }}>
                <Field.Root invalid={!!formErrors.name} position="relative">
                  <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2}>
                    <User size={16} color="#615b36" />
                    اسم العميل
                  </Field.Label>
                  <Input
                    placeholder="الاسم ثلاثي — اكتب لعرض عملاء سابقين"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }}
                    onFocus={() => {
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                        blurTimeoutRef.current = null;
                      }
                      setNameFocused(true);
                    }}
                    onBlur={() => {
                      blurTimeoutRef.current = setTimeout(() => {
                        setNameFocused(false);
                      }, 180);
                    }}
                    {...inputStyles}
                    borderColor={formErrors.name ? "red.300" : "gray.200"}
                    autoComplete="off"
                  />
                  {formErrors.name && <Field.ErrorText>{formErrors.name}</Field.ErrorText>}
                  {showSuggestionList && (
                    <Box
                      position="absolute"
                      left={0}
                      right={0}
                      top="100%"
                      mt={1}
                      zIndex={20}
                      bg="white"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      boxShadow="md"
                      maxH="220px"
                      overflowY="auto"
                    >
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        px={3}
                        py={2}
                        borderBottom="1px solid"
                        borderColor="gray.100"
                      >
                        عملاء سبق تسجيلهم
                      </Text>
                      {nameSuggestions.map((c, idx) => (
                        <Box
                          key={`${c.customerPhone}-${c.customerName}-${idx}`}
                          px={3}
                          py={2}
                          cursor="pointer"
                          _hover={{ bg: "gray.50" }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (blurTimeoutRef.current) {
                              clearTimeout(blurTimeoutRef.current);
                              blurTimeoutRef.current = null;
                            }
                            applyCustomerHint(c);
                            setNameFocused(false);
                          }}
                        >
                          <Text fontWeight="medium" color="gray.800">
                            {c.customerName}
                          </Text>
                          {c.customerPhone ? (
                            <Text fontSize="sm" color="gray.500" dir="ltr" textAlign="right">
                              {c.customerPhone}
                            </Text>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Field.Root>

                <Field.Root invalid={!!formErrors.phone}>
                  <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2}>
                    <Phone size={16} color="#615b36" />
                    رقم الهاتف
                  </Field.Label>
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
                    }}
                    inputMode="tel"
                    dir="ltr"
                    textAlign="left"
                    {...inputStyles}
                    borderColor={formErrors.phone ? "red.300" : "gray.200"}
                  />
                  {formErrors.phone && <Field.ErrorText>{formErrors.phone}</Field.ErrorText>}
                </Field.Root>

                <Field.Root invalid={!!formErrors.age}>
                  <Field.Label fontSize="sm" color="gray.700">
                    السن (اختياري)
                  </Field.Label>
                  <Input
                    placeholder="اختياري - مثال: 30"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value.replace(/\D/g, ""));
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.age;
                        return next;
                      });
                    }}
                    inputMode="numeric"
                    {...inputStyles}
                    borderColor={formErrors.age ? "red.300" : "gray.200"}
                  />
                  {formErrors.age && <Field.ErrorText>{formErrors.age}</Field.ErrorText>}
                </Field.Root>
                </SimpleGrid>
                </Box>

                {isNewBooking ? (
                  <>
                    <Field.Root invalid={!!formErrors.doctorId}>
                      <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2}>
                        <Stethoscope size={16} color="#615b36" />
                        الطبيب
                      </Field.Label>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => {
                          setSelectedDoctorId(Number(e.target.value) || 0);
                          setTime("");
                          setAvailableSlots([]);
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.doctorId;
                            delete next.time;
                            return next;
                          });
                        }}
                        style={selectStyle(!!formErrors.doctorId)}
                      >
                        <option value={0}>اختر الطبيب</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.user?.name || doc.name || `Doctor #${doc.id}`}
                          </option>
                        ))}
                      </select>
                      {formErrors.doctorId && <Field.ErrorText>{formErrors.doctorId}</Field.ErrorText>}
                    </Field.Root>

                    <Field.Root invalid={!!(formErrors.date || formErrors.time)}>
                      <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2}>
                        <Clock size={16} color="#615b36" />
                        تاريخ الحجز
                      </Field.Label>
                    <Flex
                      align="center"
                      justify="space-between"
                      p={3}
                      mb={3}
                      bg={noTime ? "orange.50" : "white"}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={noTime ? "orange.200" : "gray.200"}
                    >
                      <Box>
                        <Text fontWeight="medium" fontSize="sm">
                          حجز بدون وقت محدد
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          يُسجَّل للتاريخ فقط — بدون ساعة
                        </Text>
                      </Box>
                      <Switch.Root
                        checked={noTime}
                        onCheckedChange={(e) => {
                          const checked = !!e.checked;
                          setNoTime(checked);
                          if (checked) setTime("");
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.time;
                            return next;
                          });
                        }}
                        colorPalette="orange"
                      >
                        <Switch.HiddenInput />
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Root>
                    </Flex>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                        <Input
                          type="date"
                          value={date}
                          min={formatDateLocal(new Date())}
                          onChange={(e) => {
                            setDate(e.target.value);
                            if (!noTime) setTime("");
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.date;
                              if (!noTime) delete next.time;
                              return next;
                            });
                          }}
                          {...inputStyles}
                          borderColor={formErrors.date ? "red.300" : "gray.200"}
                        />
                        {noTime ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="sm"
                            color="orange.700"
                            fontWeight="medium"
                            bg="orange.50"
                            borderRadius="md"
                            border="1px dashed"
                            borderColor="orange.200"
                            minH="48px"
                            px={3}
                            textAlign="center"
                          >
                            بدون وقت — لليوم فقط
                          </Box>
                        ) : isLoadingSlots ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="sm"
                            color="gray.500"
                            bg="gray.50"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="gray.200"
                            minH="48px"
                          >
                            جاري جلب المواعيد...
                          </Box>
                        ) : (
                          <select
                            value={time}
                            onChange={(e) => {
                              setTime(e.target.value);
                              setFormErrors((prev) => {
                                const next = { ...prev };
                                delete next.time;
                                return next;
                              });
                            }}
                            style={selectStyle(!!formErrors.time)}
                          >
                            <option value="">
                              {availableSlots.length > 0
                                ? "اختر الوقت"
                                : "لا توجد مواعيد متاحة"}
                            </option>
                            {availableSlots.map((slot) => (
                              <option key={slot} value={slot}>
                                {formatSlotTo12Hour(slot)}
                              </option>
                            ))}
                          </select>
                        )}
                      </SimpleGrid>
                      {formErrors.date && <Field.ErrorText>{formErrors.date}</Field.ErrorText>}
                      {formErrors.time && <Field.ErrorText>{formErrors.time}</Field.ErrorText>}
                    </Field.Root>
                  </>
                ) : (
                  <Box
                    p={3}
                    bg="blue.50"
                    border="1px solid"
                    borderColor="blue.100"
                    borderRadius="lg"
                  >
                    <Text fontSize="sm" color="blue.800" fontWeight="medium">
                      تعديل الحجز لا يغير الطبيب أو تاريخ/وقت الموعد.
                    </Text>
                  </Box>
                )}

                <Field.Root invalid={!!formErrors.visitType}>
                  <Field.Label fontSize="sm" color="gray.700" mb={2}>
                    اختيار الخدمات
                  </Field.Label>
                  <Flex wrap="wrap" gap={2}>
                    {availableServices.map((service) => {
                      const selected = selectedServices.some((row) => row.name === service);
                      return (
                        <Button
                          key={service}
                          type="button"
                          size="sm"
                          variant={selected ? "solid" : "outline"}
                          bg={selected ? "#615b36" : "white"}
                          color={selected ? "white" : "gray.700"}
                          borderColor={selected ? "#615b36" : "gray.300"}
                          _hover={{
                            bg: selected ? "#4a452a" : "gray.50",
                          }}
                          onClick={() => toggleService(service)}
                          fontWeight="medium"
                          borderRadius="full"
                          px={4}
                        >
                          {service}
                        </Button>
                      );
                    })}
                  </Flex>
                  {formErrors.visitType && <Field.ErrorText>{formErrors.visitType}</Field.ErrorText>}
                </Field.Root>

                {selectedServices.length > 0 && (
                  <Field.Root invalid={!!formErrors.services}>
                    <Field.Label fontSize="sm" color="gray.700" mb={2}>
                      أسعار الخدمات
                    </Field.Label>
                    <VStack align="stretch" gap={2}>
                      {selectedServices.map((row) => (
                        <SimpleGrid
                          key={row.name}
                          columns={{ base: 1, md: 2 }}
                          gap={2}
                          bg="white"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="xl"
                          p={3}
                        >
                          <Box display="flex" alignItems="center">
                            <Text fontWeight="bold" color="#615b36" fontSize="sm">
                              {row.name}
                            </Text>
                          </Box>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="سعر الخدمة (EGP)"
                            value={row.price}
                            onChange={(e) =>
                              updateServicePrice(row.name, e.target.value)
                            }
                            {...inputStyles}
                            borderColor={formErrors.services ? "red.300" : "gray.200"}
                          />
                        </SimpleGrid>
                      ))}
                    </VStack>
                    {formErrors.services && <Field.ErrorText>{formErrors.services}</Field.ErrorText>}
                  </Field.Root>
                )}

                <Box
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="xl"
                  p={4}
                >
                  <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="gray.800">
                        الإجمالي
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {selectedServices.length > 0
                          ? `المختار: ${selectedServices.map((row) => row.name).join("، ")}`
                          : "لم يتم اختيار خدمات بعد"}
                      </Text>
                    </Box>
                    <Text fontSize="xl" fontWeight="bold" color="#615b36">
                      {servicesTotal} EGP
                    </Text>
                  </Flex>
                </Box>

                <Field.Root
                  invalid={
                    !!(
                      formErrors.amountPaid ||
                      formErrors.paymentMethod ||
                      formErrors.transferFromPhone
                    )
                  }
                >
                  <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2} mb={2}>
                    <CreditCard size={16} color="#615b36" />
                    طريقة الدفع
                  </Field.Label>
                  <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} mb={3}>
                    {CLINIC_PAYMENT_OPTIONS.map((opt) => {
                      const selected = paymentRows.some((row) => row.method === opt.value);
                      return (
                        <Button
                          key={opt.value}
                          type="button"
                          size="sm"
                          variant={selected ? "solid" : "outline"}
                          bg={selected ? "#615b36" : "white"}
                          color={selected ? "white" : "gray.700"}
                          borderColor={selected ? "#615b36" : "gray.300"}
                          _hover={{ bg: selected ? "#4a452a" : "gray.50" }}
                          onClick={() => togglePaymentMethod(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </SimpleGrid>
                  <VStack align="stretch" gap={2}>
                    {paymentRows.map((row, index) => (
                      <SimpleGrid
                        key={`${row.method}-${index}`}
                        columns={{ base: 1, md: 12 }}
                        gap={2}
                        alignItems="center"
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="xl"
                        p={3}
                      >
                        <Box gridColumn={{ base: "auto", md: "span 4" }}>
                          <Text fontWeight="bold" color="#615b36" fontSize="sm">
                            {CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === row.method)?.label}
                          </Text>
                          {needsTransferFromPhone(row.method) && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              يتطلب رقم المحوّل منه
                            </Text>
                          )}
                        </Box>
                        <Box
                          gridColumn={{
                            base: "auto",
                            md: needsTransferFromPhone(row.method) ? "span 3" : "span 6",
                          }}
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder={`مبلغ ${CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === row.method)?.label ?? ""}`}
                            value={row.amount}
                            onChange={(e) =>
                              updatePaymentRow(index, {
                                amount: sanitizeAmountInput(e.target.value),
                              })
                            }
                            {...inputStyles}
                            borderColor={formErrors.amountPaid ? "red.300" : "gray.200"}
                          />
                        </Box>
                        {needsTransferFromPhone(row.method) && (
                          <Box gridColumn={{ base: "auto", md: "span 3" }}>
                            <Input
                              type="text"
                              inputMode="tel"
                              placeholder="رقم المحوّل منه"
                              value={row.transferFromPhone ?? ""}
                              onChange={(e) =>
                                updatePaymentRow(index, {
                                  transferFromPhone: e.target.value.replace(/\D/g, ""),
                                })
                              }
                              dir="ltr"
                              textAlign="left"
                              {...inputStyles}
                              borderColor={
                                formErrors.transferFromPhone ? "red.300" : "gray.200"
                              }
                            />
                          </Box>
                        )}
                        <Button
                          type="button"
                          gridColumn={{ base: "auto", md: "span 2" }}
                          variant="ghost"
                          colorPalette="red"
                          disabled={paymentRows.length <= 1}
                          onClick={() => togglePaymentMethod(row.method)}
                        >
                          إزالة
                        </Button>
                      </SimpleGrid>
                    ))}
                  </VStack>
                  <Flex justify="space-between" mt={2} gap={3} flexWrap="wrap">
                    <Text fontSize="xs" color="gray.500">
                      يمكنك اختيار أكثر من طريقة دفع وتحديد مبلغ لكل طريقة.
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="#615b36">
                      المدفوع: {totalPaymentAmount} EGP
                    </Text>
                  </Flex>
                  {formErrors.amountPaid && <Field.ErrorText>{formErrors.amountPaid}</Field.ErrorText>}
                  {formErrors.paymentMethod && <Field.ErrorText>{formErrors.paymentMethod}</Field.ErrorText>}
                  {formErrors.transferFromPhone && (
                    <Field.ErrorText>{formErrors.transferFromPhone}</Field.ErrorText>
                  )}
                </Field.Root>

                <Flex
                  gap={3}
                  mt={2}
                  pt={4}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  flexDirection={{ base: "column-reverse", sm: "row" }}
                >
                  <Button
                    flex={1}
                    onClick={() => void handleSave()}
                    bg="#615b36"
                    color="white"
                    _hover={{ bg: "#4a452a" }}
                    minH="48px"
                    fontSize="md"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "جاري الحفظ..." : isNewBooking ? "تأكيد الحجز" : "حفظ التعديلات"}
                  </Button>
                  <Button
                    flex={1}
                    onClick={onClose}
                    variant="outline"
                    colorPalette="gray"
                    minH="48px"
                    disabled={isSubmitting}
                  >
                    إلغاء
                  </Button>
                </Flex>
              </VStack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
