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
    Badge,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { toaster } from "@/components/ui/toaster";
import { Clock, User, Phone, CalendarDays, CheckCircle } from "lucide-react";
import api from "@/lib/axios";
import {
    AvailableSlotsResponse,
    Patient,
    SlotBooking,
    UpsertPatientData,
} from "@/types/booking";

// ─── Props ────────────────────────────────────────────────────────────────────
interface SlotBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** called with the created booking on success */
    onSuccess?: (booking: SlotBooking) => void;
    /** pre-fill a date — defaults to today */
    defaultDate?: string;
    /** 'online' (default) | 'clinic' */
    bookingType?: "online" | "clinic";
}

type Step = "patient" | "date" | "slot" | "confirm" | "done";

// ─── Component ────────────────────────────────────────────────────────────────
export default function SlotBookingModal({
    isOpen,
    onClose,
    onSuccess,
    defaultDate,
    bookingType = "online",
}: SlotBookingModalProps) {
    // Step tracker
    const [step, setStep] = useState<Step>("patient");

    // Patient form
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [patient, setPatient] = useState<Patient | null>(null);

    // Date + slots
    const [selectedDate, setSelectedDate] = useState(
        defaultDate || new Date().toISOString().split("T")[0]
    );
    const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
    const [isFetchingSlots, setIsFetchingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    // Booking
    const [isBooking, setIsBooking] = useState(false);
    const [createdBooking, setCreatedBooking] = useState<SlotBooking | null>(null);

    // Reset on open/close
    useEffect(() => {
        if (isOpen) {
            setStep("patient");
            setName("");
            setPhone("");
            setEmail("");
            setPatient(null);
            setSelectedDate(defaultDate || new Date().toISOString().split("T")[0]);
            setSlotsData(null);
            setSelectedSlot(null);
            setCreatedBooking(null);
        }
    }, [isOpen, defaultDate]);

    // ── Step 1: create/find patient ───────────────────────────────────────────
    const handlePatientStep = async () => {
        if (!phone.trim()) {
            toaster.create({ title: "رقم الهاتف مطلوب", type: "error", duration: 2000 });
            return;
        }
        try {
            const body: UpsertPatientData = { phone: phone.trim() };
            if (name.trim()) body.name = name.trim();
            if (email.trim()) body.email = email.trim();

            const res = await api.post("/patients", body);
            const p: Patient = res.data.patient ?? res.data;
            setPatient(p);
            setStep("date");
        } catch (error: any) {
            toaster.create({
                title: "خطأ",
                description: error.response?.data?.message || "حدث خطأ",
                type: "error",
                duration: 3000,
            });
        }
    };

    // ── Step 2: fetch available slots for selected date ───────────────────────
    const handleFetchSlots = async () => {
        if (!selectedDate) {
            toaster.create({ title: "الرجاء اختيار تاريخ", type: "error", duration: 2000 });
            return;
        }
        setIsFetchingSlots(true);
        setSlotsData(null);
        setSelectedSlot(null);
        try {
            const res = await api.get("/bookings/available-slots", {
                params: { date: selectedDate },
            });
            setSlotsData(res.data);
            if (res.data.available) {
                setStep("slot");
            } else {
                // still show result, but stay on date step to show message
                setStep("slot");
            }
        } catch (error: any) {
            const data = error.response?.data;
            setSlotsData({ available: false, message: data?.message || "حدث خطأ" });
            setStep("slot");
        } finally {
            setIsFetchingSlots(false);
        }
    };

    // ── Step 3: book selected slot ────────────────────────────────────────────
    const handleBook = async () => {
        if (!patient || !selectedSlot) return;
        setIsBooking(true);
        try {
            const res = await api.post("/bookings/slots", {
                patientId: patient.id,
                date: selectedDate,
                timeSlot: selectedSlot,
                bookingType,
            });
            const booking: SlotBooking = res.data.booking ?? res.data;
            setCreatedBooking(booking);
            setStep("done");
            onSuccess?.(booking);
        } catch (error: any) {
            toaster.create({
                title: "خطأ في الحجز",
                description: error.response?.data?.message || "حدث خطأ",
                type: "error",
                duration: 3000,
            });
        } finally {
            setIsBooking(false);
        }
    };

    // ── Step titles ───────────────────────────────────────────────────────────
    const stepTitles: Record<Step, string> = {
        patient: "بيانات المريض",
        date: "اختيار التاريخ",
        slot: "اختيار الموعد",
        confirm: "تأكيد الحجز",
        done: "تم الحجز بنجاح 🎉",
    };

    // ── Step indicators ───────────────────────────────────────────────────────
    const stepList: Step[] = ["patient", "date", "slot", "done"];
    const stepIdx = stepList.indexOf(step);

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
                    padding={4}
                >
                    <Dialog.Content
                        dir="rtl"
                        bg="white"
                        borderRadius="2xl"
                        overflow="hidden"
                        boxShadow="2xl"
                        width={{ base: "95%", md: "520px" }}
                        maxH="92vh"
                        outline="none"
                        overflowY="auto"
                    >
                        {/* Header */}
                        <Box
                            bg="linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)"
                            px={6}
                            py={5}
                            position="relative"
                        >
                            <Text fontSize="lg" fontWeight="bold" color="white" mb={1}>
                                {stepTitles[step]}
                            </Text>
                            {/* Step dots */}
                            <Flex gap={2} mt={2}>
                                {stepList.map((s, i) => (
                                    <Box
                                        key={s}
                                        w={i <= stepIdx ? 8 : 2}
                                        h={2}
                                        borderRadius="full"
                                        bg={i <= stepIdx ? "white" : "whiteAlpha.400"}
                                        transition="all 0.3s"
                                    />
                                ))}
                            </Flex>
                            <Dialog.CloseTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    color="whiteAlpha.800"
                                    _hover={{ bg: "whiteAlpha.200", color: "white" }}
                                    rounded="full"
                                    w={8}
                                    h={8}
                                    minW={0}
                                    p={0}
                                    position="absolute"
                                    top={4}
                                    left={4}
                                    onClick={onClose}
                                >
                                    ✕
                                </Button>
                            </Dialog.CloseTrigger>
                        </Box>

                        <Box p={6}>
                            {/* ─── Step: Patient ──────────────────────────────────── */}
                            {step === "patient" && (
                                <VStack gap={4} align="stretch">
                                    <Text color="gray.500" fontSize="sm">
                                        أدخل بيانات المريض للبحث عنه أو إنشاء سجل جديد
                                    </Text>
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            رقم الهاتف <Text as="span" color="red.400">*</Text>
                                        </Text>
                                        <Flex align="center" gap={2} position="relative">
                                            <Box position="absolute" right={3} color="gray.400" zIndex={1}>
                                                <Phone size={16} />
                                            </Box>
                                            <Input
                                                placeholder="01xxxxxxxxx"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                bg="gray.50"
                                                pr={9}
                                                borderColor="gray.200"
                                                _focus={{ borderColor: "#2d6a4f", bg: "white" }}
                                                onKeyDown={(e) => e.key === "Enter" && handlePatientStep()}
                                            />
                                        </Flex>
                                    </Box>
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            الاسم (اختياري)
                                        </Text>
                                        <Flex align="center" gap={2} position="relative">
                                            <Box position="absolute" right={3} color="gray.400" zIndex={1}>
                                                <User size={16} />
                                            </Box>
                                            <Input
                                                placeholder="الاسم الكامل"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                bg="gray.50"
                                                pr={9}
                                                borderColor="gray.200"
                                                _focus={{ borderColor: "#2d6a4f", bg: "white" }}
                                            />
                                        </Flex>
                                    </Box>
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            البريد الإلكتروني (اختياري)
                                        </Text>
                                        <Input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            _focus={{ borderColor: "#2d6a4f", bg: "white" }}
                                            dir="ltr"
                                            textAlign="right"
                                        />
                                    </Box>
                                    <Button
                                        onClick={handlePatientStep}
                                        bg="#2d6a4f"
                                        color="white"
                                        _hover={{ bg: "#1b4332" }}
                                        size="lg"
                                        borderRadius="xl"
                                        mt={2}
                                    >
                                        التالي — اختيار التاريخ
                                    </Button>
                                </VStack>
                            )}

                            {/* ─── Step: Date ─────────────────────────────────────── */}
                            {step === "date" && (
                                <VStack gap={4} align="stretch">
                                    {patient && (
                                        <Box bg="green.50" borderRadius="xl" p={4}>
                                            <Flex align="center" gap={3}>
                                                <Box p={2} bg="green.100" borderRadius="lg">
                                                    <User size={18} color="#2d6a4f" />
                                                </Box>
                                                <Box>
                                                    <Text fontWeight="bold" color="#2d6a4f">{patient.name || "مريض"}</Text>
                                                    <Text fontSize="sm" color="gray.600">{patient.phone}</Text>
                                                </Box>
                                                <Badge colorPalette="green" variant="subtle" mr="auto">
                                                    تم التحقق ✓
                                                </Badge>
                                            </Flex>
                                        </Box>
                                    )}
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            اختر تاريخ الحجز
                                        </Text>
                                        <Input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            min={new Date().toISOString().split("T")[0]}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            _focus={{ borderColor: "#2d6a4f", bg: "white" }}
                                            size="lg"
                                        />
                                    </Box>
                                    <Flex gap={3} mt={2}>
                                        <Button
                                            flex={1}
                                            onClick={() => setStep("patient")}
                                            variant="outline"
                                            colorPalette="gray"
                                            borderRadius="xl"
                                        >
                                            رجوع
                                        </Button>
                                        <Button
                                            flex={2}
                                            onClick={handleFetchSlots}
                                            bg="#2d6a4f"
                                            color="white"
                                            _hover={{ bg: "#1b4332" }}
                                            loading={isFetchingSlots}
                                            borderRadius="xl"
                                        >
                                            <CalendarDays size={18} style={{ marginLeft: 6 }} />
                                            عرض المواعيد المتاحة
                                        </Button>
                                    </Flex>
                                </VStack>
                            )}

                            {/* ─── Step: Slot ─────────────────────────────────────── */}
                            {step === "slot" && (
                                <VStack gap={4} align="stretch">
                                    {/* Date info */}
                                    <Box bg="gray.50" borderRadius="xl" p={3}>
                                        <Flex align="center" gap={2} color="gray.600">
                                            <CalendarDays size={16} />
                                            <Text fontWeight="medium">
                                                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ar-EG", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </Text>
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                colorPalette="blue"
                                                mr="auto"
                                                onClick={() => setStep("date")}
                                            >
                                                تغيير
                                            </Button>
                                        </Flex>
                                        {slotsData?.workingHours && (
                                            <Flex align="center" gap={2} color="#2d6a4f" mt={1} fontSize="sm">
                                                <Clock size={14} />
                                                <Text>ساعات العمل: {slotsData.workingHours.start} — {slotsData.workingHours.end}</Text>
                                            </Flex>
                                        )}
                                    </Box>

                                    {/* عدم توفر حجز لهذا اليوم أو لا توجد مواعيد */}
                                    {slotsData != null &&
                                        (slotsData?.available_slots ?? slotsData?.availableSlots ?? []).length === 0 && (
                                            <Box
                                                bg="orange.50"
                                                border="1px solid"
                                                borderColor="orange.200"
                                                borderRadius="xl"
                                                p={5}
                                                textAlign="center"
                                            >
                                                <Text fontSize="3xl" mb={2}>⚠️</Text>
                                                <Text fontWeight="bold" color="orange.700" fontSize="lg">
                                                    {slotsData?.message || "لا توجد مواعيد متاحة لهذا اليوم"}
                                                </Text>
                                                <Text color="gray.500" fontSize="sm" mt={1}>
                                                    يرجى اختيار يوم آخر
                                                </Text>
                                                <Button
                                                    mt={4}
                                                    onClick={() => setStep("date")}
                                                    colorPalette="orange"
                                                    variant="subtle"
                                                    borderRadius="xl"
                                                >
                                                    اختر تاريخاً آخر
                                                </Button>
                                            </Box>
                                        )}

                                    {/* شبكة المواعيد المتاحة (available_slots فقط — حجز واحد لكل موعد) */}
                                    {(slotsData?.available_slots ?? slotsData?.availableSlots ?? []).length > 0 && (
                                        <>
                                            <Text fontSize="sm" color="gray.600" fontWeight="medium">
                                                اختر الوقت المناسب (سلاطات 10 دقائق، حجز واحد لكل موعد):
                                            </Text>
                                            <Box
                                                display="grid"
                                                gridTemplateColumns="repeat(3, 1fr)"
                                                gap={2}
                                            >
                                                {(slotsData?.available_slots ?? slotsData?.availableSlots ?? []).map(
                                                    (timeSlot) => (
                                                        <Box
                                                            key={timeSlot}
                                                            as="button"
                                                            onClick={() => setSelectedSlot(timeSlot)}
                                                            p={3}
                                                            borderRadius="xl"
                                                            border="2px solid"
                                                            borderColor={
                                                                selectedSlot === timeSlot ? "#2d6a4f" : "gray.200"
                                                            }
                                                            bg={selectedSlot === timeSlot ? "green.50" : "white"}
                                                            cursor="pointer"
                                                            _hover={{ borderColor: "#2d6a4f", bg: "green.50" }}
                                                            transition="all 0.15s"
                                                            textAlign="center"
                                                        >
                                                            <Text
                                                                fontWeight="bold"
                                                                fontSize="md"
                                                                color={
                                                                    selectedSlot === timeSlot ? "#2d6a4f" : "gray.700"
                                                                }
                                                            >
                                                                {timeSlot}
                                                            </Text>
                                                            <Text fontSize="xs" color="gray.400" mt={0.5}>
                                                                متاح
                                                            </Text>
                                                        </Box>
                                                    )
                                                )}
                                            </Box>

                                            {selectedSlot && (
                                                <Box bg="green.50" borderRadius="xl" p={4}>
                                                    <Flex align="center" gap={2}>
                                                        <Clock size={16} color="#2d6a4f" />
                                                        <Text fontWeight="bold" color="#2d6a4f">
                                                            تم اختيار الموعد: {selectedSlot}
                                                        </Text>
                                                    </Flex>
                                                </Box>
                                            )}

                                            <Flex gap={3}>
                                                <Button
                                                    flex={1}
                                                    onClick={() => setStep("date")}
                                                    variant="outline"
                                                    colorPalette="gray"
                                                    borderRadius="xl"
                                                >
                                                    رجوع
                                                </Button>
                                                <Button
                                                    flex={2}
                                                    onClick={handleBook}
                                                    bg="#2d6a4f"
                                                    color="white"
                                                    _hover={{ bg: "#1b4332" }}
                                                    disabled={!selectedSlot}
                                                    loading={isBooking}
                                                    borderRadius="xl"
                                                >
                                                    تأكيد الحجز
                                                </Button>
                                            </Flex>
                                        </>
                                    )}
                                </VStack>
                            )}

                            {/* ─── Step: Done ─────────────────────────────────────── */}
                            {step === "done" && createdBooking && (
                                <VStack gap={5} align="center" py={4}>
                                    <Box
                                        w={20}
                                        h={20}
                                        borderRadius="full"
                                        bg="green.50"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <CheckCircle size={44} color="#2d6a4f" />
                                    </Box>
                                    <Text fontSize="2xl" fontWeight="bold" color="#2d6a4f" textAlign="center">
                                        تم الحجز بنجاح!
                                    </Text>

                                    <Box
                                        bg="gray.50"
                                        borderRadius="2xl"
                                        p={5}
                                        w="full"
                                        border="1px solid"
                                        borderColor="gray.100"
                                    >
                                        <VStack gap={3} align="stretch">
                                            <Flex justify="space-between">
                                                <Text color="gray.500" fontSize="sm">المريض</Text>
                                                <Text fontWeight="bold">{patient?.name || patient?.phone}</Text>
                                            </Flex>
                                            <Flex justify="space-between">
                                                <Text color="gray.500" fontSize="sm">التاريخ</Text>
                                                <Text fontWeight="bold">{createdBooking.slotDate}</Text>
                                            </Flex>
                                            <Flex justify="space-between">
                                                <Text color="gray.500" fontSize="sm">الوقت</Text>
                                                <Text fontWeight="bold" color="#2d6a4f">{createdBooking.timeSlot}</Text>
                                            </Flex>
                                            <Flex justify="space-between">
                                                <Text color="gray.500" fontSize="sm">نوع الحجز</Text>
                                                <Badge
                                                    colorPalette={createdBooking.bookingType === "online" ? "blue" : "purple"}
                                                    variant="subtle"
                                                >
                                                    {createdBooking.bookingType === "online" ? "أونلاين" : "عيادة"}
                                                </Badge>
                                            </Flex>
                                            <Flex justify="space-between">
                                                <Text color="gray.500" fontSize="sm">رقم الحجز</Text>
                                                <Text fontWeight="bold" color="gray.600">#{createdBooking.id}</Text>
                                            </Flex>
                                        </VStack>
                                    </Box>

                                    <Button
                                        onClick={onClose}
                                        bg="#2d6a4f"
                                        color="white"
                                        _hover={{ bg: "#1b4332" }}
                                        size="lg"
                                        borderRadius="xl"
                                        w="full"
                                    >
                                        إغلاق
                                    </Button>
                                </VStack>
                            )}
                        </Box>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
