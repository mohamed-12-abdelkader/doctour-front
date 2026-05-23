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
import { Plus, CalendarPlus, User, Phone, Stethoscope, Clock, Banknote, CreditCard } from "lucide-react";
import {
  Booking,
  CLINIC_PAYMENT_OPTIONS,
  type ClinicPaymentMethod,
} from "@/types/booking";
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
  const parts = Array.isArray(vt)
    ? vt.map(String)
    : String(vt)
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

function isServiceLabelAsName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return BOOKING_SERVICES.some((s) => s.toLowerCase() === n);
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
    | "doctorId"
    | "date"
    | "time"
    | "amountPaid"
    | "paymentMethod"
    | "visitType",
    string
  >
>;

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
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ClinicPaymentMethod>("cash");
  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([
    BOOKING_SERVICES[0] ?? "كشف",
  ]);
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

  const toggleVisitType = (service: string) => {
    const label = parseApiVisitTypeToUi(service);
    setSelectedVisitTypes((prev) => {
      if (prev.includes(label)) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s !== label);
      }
      return [...prev, label];
    });
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.visitType;
      return next;
    });
  };

  const applyCustomerHint = (c: KnownCustomerHint) => {
    setName(c.customerName);
    setPhone(c.customerPhone || "");
    if (c.visitType) {
      setSelectedVisitTypes(parseVisitTypesFromInitial(c.visitType));
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
        setSelectedVisitTypes(parseVisitTypesFromInitial(initialData.visitType));

        const amountRaw =
          typeof initialData.amountPaid === "string"
            ? initialData.amountPaid
            : initialData.amountPaid?.toString() ?? "";
        setAmountPaid(sanitizeAmountInput(amountRaw) || "0");
        setPaymentMethod(
          normalizePaymentMethod((initialData as { paymentMethod?: string }).paymentMethod),
        );
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
        setDate(defaultDate || formatDateLocal(new Date()));
        setTime("");
        setNoTime(defaultNoTime);
        setAmountPaid("");
        setPaymentMethod("cash");
        setSelectedVisitTypes([BOOKING_SERVICES[0] ?? "كشف"]);
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
    } else if (isServiceLabelAsName(trimmedName)) {
      errors.name = "أدخل اسم العميل وليس نوع الخدمة (مثل: كشف)";
    } else if (/^\d+$/.test(trimmedName.replace(/\s/g, ""))) {
      errors.name = "الاسم لا يمكن أن يكون أرقامًا فقط";
    }

    const phoneErr = validateEgyptPhone(phone);
    if (phoneErr) errors.phone = phoneErr;

    if (!selectedDoctorId) errors.doctorId = "يرجى اختيار الطبيب";

    if (!date) {
      errors.date = "يرجى اختيار تاريخ الحجز";
    } else if (isNewBooking) {
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

    const amount = parseAmountPaid(amountPaid);
    if (amount === null) {
      errors.amountPaid = "أدخل مبلغًا صحيحًا (مثل: 100 أو 150)";
    }

    if (selectedVisitTypes.length === 0) {
      errors.visitType = "اختر نوعًا واحدًا على الأقل";
    } else if (
      selectedVisitTypes.some((t) => !BOOKING_SERVICES.includes(t))
    ) {
      errors.visitType = "اختر أنواع الحجز من القائمة فقط";
    }

    if (!paymentMethod) {
      errors.paymentMethod = "اختر طريقة الدفع";
    }

    return errors;
  }, [
    name,
    phone,
    selectedDoctorId,
    date,
    time,
    noTime,
    amountPaid,
    paymentMethod,
    selectedVisitTypes,
    availableSlots,
    isNewBooking,
  ]);

  const handleAmountChange = (raw: string) => {
    setAmountPaid(sanitizeAmountInput(raw));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.amountPaid;
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

    const amount = parseAmountPaid(amountPaid)!;
    const visitTypesForApi = selectedVisitTypes.map(mapVisitTypeForApi);
    const bookingData: Record<string, unknown> = {
      name: name.trim(),
      phone: phone.replace(/\D/g, ""),
      date,
      doctorId: selectedDoctorId,
      amountPaid: amount,
      paymentMethod,
      procedureTypes: visitTypesForApi,
      visitTypes: visitTypesForApi,
    };
    if (noTime) {
      bookingData.noTime = true;
    } else {
      bookingData.time = time;
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
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 4, md: 5 }}>
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
                </SimpleGrid>

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
                    تاريخ ووقت الحجز
                  </Field.Label>
                  {isNewBooking && (
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
                  )}
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

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 4, md: 5 }}>
                  <Field.Root invalid={!!formErrors.amountPaid}>
                    <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2}>
                      <Banknote size={16} color="#615b36" />
                      المبلغ المدفوع (EGP)
                    </Field.Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="مثال: 100 أو 500"
                      value={amountPaid}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      {...inputStyles}
                      borderColor={formErrors.amountPaid ? "red.300" : "gray.200"}
                    />
                    <Field.HelperText fontSize="xs" color="gray.500">
                      أرقام صحيحة فقط (100 وليس 0100)
                    </Field.HelperText>
                    {formErrors.amountPaid && <Field.ErrorText>{formErrors.amountPaid}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root invalid={!!formErrors.paymentMethod}>
                    <Field.Label fontSize="sm" color="gray.700" display="flex" alignItems="center" gap={2}>
                      <CreditCard size={16} color="#615b36" />
                      طريقة الدفع
                    </Field.Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(normalizePaymentMethod(e.target.value));
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.paymentMethod;
                          return next;
                        });
                      }}
                      style={selectStyle(!!formErrors.paymentMethod)}
                    >
                      {CLINIC_PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.paymentMethod && (
                      <Field.ErrorText>{formErrors.paymentMethod}</Field.ErrorText>
                    )}
                  </Field.Root>
                </SimpleGrid>

                <Field.Root invalid={!!formErrors.visitType}>
                  <Field.Label fontSize="sm" color="gray.700" mb={2}>
                    نوع الحجز / الخدمة (يمكن اختيار أكثر من نوع)
                  </Field.Label>
                  <Flex wrap="wrap" gap={2}>
                    {BOOKING_SERVICES.map((service) => {
                      const selected = selectedVisitTypes.includes(service);
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
                          onClick={() => toggleVisitType(service)}
                          fontWeight="medium"
                          borderRadius="full"
                          px={4}
                        >
                          {service}
                        </Button>
                      );
                    })}
                  </Flex>
                  {selectedVisitTypes.length > 0 && (
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      المختار: {selectedVisitTypes.join("، ")}
                      {selectedVisitTypes.includes("متابعة")
                        ? " — يُرسل «متابعة» للسيرفر كـ «إعادة»"
                        : ""}
                    </Text>
                  )}
                  {formErrors.visitType && <Field.ErrorText>{formErrors.visitType}</Field.ErrorText>}
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
