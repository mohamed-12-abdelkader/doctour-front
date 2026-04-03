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
} from "@chakra-ui/react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Booking } from "@/types/booking";
import api from "@/lib/axios";
import { BOOKING_SERVICES } from "@/data/services";

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
  onSave: (booking: any) => void;
  initialData?: Booking | null;
  doctorId?: number | null;
  /** اختياري: يُدمج مع نتيجة GET /bookings/all (سنة سابقة) داخل المودال */
  knownCustomers?: KnownCustomerHint[];
}

export default function BookingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  doctorId,
  knownCustomers = [],
}: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [visitType, setVisitType] = useState<string>(BOOKING_SERVICES[0] ?? "");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: number; name?: string; user?: { name?: string } }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(0);
  const [nameFocused, setNameFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiKnownCustomers, setApiKnownCustomers] = useState<KnownCustomerHint[]>(
    [],
  );

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

  const applyCustomerHint = (c: KnownCustomerHint) => {
    setName(c.customerName);
    setPhone(c.customerPhone || "");
    const vt = c.visitType;
    if (vt && typeof vt === "string") {
      setVisitType(vt);
    }
    const docId = Number(c.doctorId ?? 0);
    if (docId > 0 && doctors.some((d) => d.id === docId)) {
      setSelectedDoctorId(docId);
      setTime("");
      setAvailableSlots([]);
    }
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
        setVisitType(
          (typeof initialData.visitType === "string" && initialData.visitType) ||
            BOOKING_SERVICES[0] ||
            ""
        );

        const amount =
          typeof initialData.amountPaid === "string"
            ? initialData.amountPaid
            : initialData.amountPaid?.toString() || "0";
        setAmountPaid(amount);
        setSelectedDoctorId(
          Number((initialData as any).doctorId ?? doctorId ?? 0),
        );

        const appointmentDateTime = initialData.appointmentDate || "";

        if (appointmentDateTime && appointmentDateTime.includes("T")) {
          const [rawDate = "", rawTime = ""] = appointmentDateTime.split("T");
          const timeFromIso = rawTime.slice(0, 5);
          setDate(rawDate || new Date().toISOString().split("T")[0]);
          setTime(timeFromIso || "");
        } else {
          setDate(new Date().toISOString().split("T")[0]);
          setTime("");
        }
      } else {
        // Reset for new entry
        setName("");
        setPhone("");
        setDate(new Date().toISOString().split("T")[0]);
        setTime("");
        setAmountPaid("0");
        setVisitType(BOOKING_SERVICES[0] ?? "");
        setAvailableSlots([]);
        setSelectedDoctorId(Number(doctorId ?? 0));
      }
    }
  }, [isOpen, initialData, doctorId]);

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

  // Fetch available slots when date changes (or modal opens)
  useEffect(() => {
    const fetchSlots = async () => {
      if (!isOpen || !date || !selectedDoctorId) {
        setAvailableSlots([]);
        return;
      }
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      try {
        const res = await api.get("/bookings/available-slots", {
          params: { date, doctorId: selectedDoctorId },
        });
        const slots =
          res.data?.available_slots ?? res.data?.availableSlots ?? [];
        setAvailableSlots(Array.isArray(slots) ? slots : []);
      } catch {
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [isOpen, date, selectedDoctorId]);

  useEffect(() => {
    if (!isOpen) setNameFocused(false);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const handleSave = () => {
    if (!name || !date || !phone) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (!selectedDoctorId) {
      alert("يرجى اختيار الطبيب");
      return;
    }
    if (!time) {
      alert("يرجى اختيار وقت الحجز من المواعيد المتاحة");
      return;
    }
    // بنبعت التاريخ كـ YYYY-MM-DD ووقت الحجز كـ time (HH:mm) حسب الـ doc
    const bookingData = {
      name,
      phone,
      date, // YYYY-MM-DD
      time: time, // HH:mm — من available-slots
      doctorId: selectedDoctorId,
      amountPaid: parseFloat(amountPaid) || 0,
      visitType,
    };
    onSave(bookingData);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
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
            width={{ base: "100%", sm: "95%", md: "500px" }}
            maxW="calc(100vw - 16px)"
            maxH={{ base: "95vh", sm: "90vh" }}
            outline="none"
            display="flex"
            flexDirection="column"
          >
            <Box
              bg="#fdfbf7"
              px={{ base: 4, md: 6 }}
              py={{ base: 3, md: 4 }}
              borderBottom="1px solid"
              borderColor="#eee"
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexShrink={0}
            >
              <Text
                fontSize={{ base: "lg", md: "xl" }}
                color="#615b36"
                fontWeight="bold"
              >
                {initialData ? "تعديل الحجز" : "إضافة حجز جديد"}
              </Text>
              <Dialog.CloseTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  color="gray.500"
                  _hover={{ bg: "blackAlpha.50", color: "red.500" }}
                  rounded="full"
                  w={8}
                  h={8}
                  minW={0}
                  p={0}
                  onClick={onClose}
                >
                  ✕
                </Button>
              </Dialog.CloseTrigger>
            </Box>

            <Box
              p={{ base: 4, md: 6 }}
              overflowY="auto"
              flex={1}
              minH={0}
            >
              <VStack gap={{ base: 3, md: 4 }} align="stretch">
                <Box position="relative">
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    اسم العميل
                  </Text>
                  <Input
                    placeholder="الاسم ثلاثي — اكتب لعرض عملاء سابقين"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    bg="gray.50"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#615b36", bg: "white" }}
                    minH={{ base: "44px", sm: "40px" }}
                    autoComplete="off"
                  />
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
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    رقم الهاتف
                  </Text>
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    textAlign="right"
                    bg="gray.50"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#615b36", bg: "white" }}
                    minH={{ base: "44px", sm: "40px" }}
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    الطبيب
                  </Text>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(Number(e.target.value) || 0);
                      setTime("");
                      setAvailableSlots([]);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.5rem",
                      borderRadius: "0.375rem",
                      border: "1px solid",
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7FAFC",
                      fontSize: "1rem",
                      outline: "none",
                      minHeight: "44px",
                    }}
                  >
                    <option value={0}>اختر الطبيب</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user?.name || doc.name || `Doctor #${doc.id}`}
                      </option>
                    ))}
                  </select>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    وقت الحجز
                  </Text>
                  <Flex
                    gap={2}
                    flexDirection={{ base: "column", sm: "row" }}
                    align="stretch"
                  >
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setTime("");
                      }}
                      bg="gray.50"
                      borderColor="gray.200"
                      flex={1}
                      _focus={{ borderColor: "#615b36", bg: "white" }}
                      minH={{ base: "44px", sm: "40px" }}
                    />
                    {isLoadingSlots ? (
                      <Box
                        flex={1}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="sm"
                        color="gray.500"
                        bg="gray.50"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                        minH={{ base: "44px", sm: "40px" }}
                      >
                        جاري جلب المواعيد...
                      </Box>
                    ) : (
                      <Box flex={1} minW={0}>
                        <select
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.625rem 0.5rem",
                            borderRadius: "0.375rem",
                            border: "1px solid",
                            borderColor: "#E2E8F0",
                            backgroundColor: "#F7FAFC",
                            fontSize: "1rem",
                            outline: "none",
                            minHeight: "44px",
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#615b36";
                            e.target.style.backgroundColor = "white";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#E2E8F0";
                            e.target.style.backgroundColor = "#F7FAFC";
                          }}
                        >
                          <option value="">
                            {availableSlots.length > 0
                              ? "اختر الوقت"
                              : "لا توجد مواعيد متاحة لهذا اليوم"}
                          </option>
                          {availableSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {formatSlotTo12Hour(slot)}
                            </option>
                          ))}
                        </select>
                      </Box>
                    )}
                  </Flex>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    المبلغ المدفوع (EGP)
                  </Text>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    bg="gray.50"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#615b36", bg: "white" }}
                    step="0.01"
                    min="0"
                    minH={{ base: "44px", sm: "40px" }}
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    نوع الحجز / الخدمة
                  </Text>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.5rem",
                      borderRadius: "0.375rem",
                      border: "1px solid",
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7FAFC",
                      fontSize: "1rem",
                      outline: "none",
                      minHeight: "44px",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#615b36";
                      e.target.style.backgroundColor = "white";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E2E8F0";
                      e.target.style.backgroundColor = "#F7FAFC";
                    }}
                  >
                    {(() => {
                      const options =
                        visitType && !BOOKING_SERVICES.includes(visitType)
                          ? [visitType, ...BOOKING_SERVICES]
                          : BOOKING_SERVICES;
                      return options.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ));
                    })()}
                  </select>
                </Box>

                <Flex
                  gap={3}
                  mt={4}
                  flexDirection={{ base: "column", sm: "row" }}
                >
                  <Button
                    flex={1}
                    onClick={handleSave}
                    bg="#615b36"
                    color="white"
                    _hover={{ bg: "#4a452a" }}
                    minH={{ base: "44px", sm: "40px" }}
                  >
                    حفظ
                  </Button>
                  <Button
                    flex={1}
                    onClick={onClose}
                    variant="outline"
                    colorPalette="gray"
                    minH={{ base: "44px", sm: "40px" }}
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
