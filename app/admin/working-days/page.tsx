"use client";

import {
    Box,
    Container,
    Flex,
    Heading,
    Text,
    Button,
    Input,
    Badge,
    IconButton,
    SimpleGrid,
    Card,
    Spinner,
    Dialog,
    Portal,
    VStack,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useState, useEffect, useMemo } from "react";
import {
    Calendar,
    Plus,
    Edit2,
    Clock,
    RefreshCw,
    CheckCircle,
    XCircle,
    CalendarDays,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import api from "@/lib/axios";
import { WorkingDay } from "@/types/booking";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

function genSlots(start: string, end: string): string[] {
    if (!start || !end) return [];
    const slots: string[] = [];
    let [sh] = start.split(":").map(Number);
    const [eh] = end.split(":").map(Number);
    while (sh < eh) {
        slots.push(`${String(sh).padStart(2, "0")}:00`);
        sh++;
    }
    return slots;
}

/** Returns the Saturday of the week containing `date` */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun … 6=Sat
    // We want Saturday as first day: Sat=6 → offset 0, Sun=0 → offset 1, … Fri=5 → offset 6
    const offset = (day + 1) % 7; // distance from Saturday
    d.setDate(d.getDate() - offset);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Arabic short weekday labels starting from Saturday */
const AR_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

interface WorkingDayFormState {
    date: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
}

const emptyForm: WorkingDayFormState = {
    date: getTodayDate(),
    startTime: "09:00",
    endTime: "17:00",
    isActive: true,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkingDaysPage() {
    const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const today = getTodayDate();

    // current month/week navigation — start at current month
    const [viewDate, setViewDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });

    // derive rangeStart / rangeEnd from viewDate (show full month)
    const rangeStart = useMemo(() => {
        const d = new Date(viewDate);
        d.setDate(1);
        return d.toISOString().split("T")[0];
    }, [viewDate]);

    const rangeEnd = useMemo(() => {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() + 1, 0);
        return d.toISOString().split("T")[0];
    }, [viewDate]);

    // modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDay, setEditingDay] = useState<WorkingDay | null>(null);
    const [form, setForm] = useState<WorkingDayFormState>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);

    // ── API ──────────────────────────────────────────────────────────────────
    const fetchWorkingDays = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/admin/working-days", {
                params: { startDate: rangeStart, endDate: rangeEnd },
            });
            const data = response.data;
            setWorkingDays(Array.isArray(data) ? data : data.workingDays ?? []);
        } catch (error: any) {
            toaster.create({
                title: "خطأ في جلب أيام العمل",
                description: error.response?.data?.message || "حدث خطأ",
                type: "error",
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkingDays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeStart, rangeEnd]);

    // ── Calendar grid ────────────────────────────────────────────────────────
    // Build calendar weeks for the current month view
    const calendarWeeks = useMemo(() => {
        // First day of month
        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        // Start from the Saturday of the week containing firstDay
        const gridStart = getWeekStart(firstDay);

        // Last day of month
        const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
        const gridEnd = new Date(lastDay);
        // extend to end of Friday of that week
        const lastOffset = (gridEnd.getDay() + 2) % 7; // days until Friday
        gridEnd.setDate(gridEnd.getDate() + (lastOffset === 0 ? 0 : 7 - lastOffset) % 7);

        const weeks: Date[][] = [];
        const cur = new Date(gridStart);
        while (cur <= gridEnd) {
            const week: Date[] = [];
            for (let i = 0; i < 7; i++) {
                week.push(new Date(cur));
                cur.setDate(cur.getDate() + 1);
            }
            weeks.push(week);
        }
        return weeks;
    }, [viewDate]);

    // index workingDays by date string for O(1) lookup
    const dayMap = useMemo(() => {
        const m: Record<string, WorkingDay> = {};
        workingDays.forEach((d) => { m[d.date] = d; });
        return m;
    }, [workingDays]);

    // ── Navigation ───────────────────────────────────────────────────────────
    const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const goToday = () => setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const monthLabel = viewDate.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

    // ── Modal helpers ────────────────────────────────────────────────────────
    const openAddModal = (prefillDate?: string) => {
        setEditingDay(null);
        setForm({ ...emptyForm, date: prefillDate || today });
        setIsModalOpen(true);
    };

    const openEditModal = (day: WorkingDay) => {
        setEditingDay(day);
        setForm({
            date: day.date,
            startTime: day.startTime,
            endTime: day.endTime,
            isActive: day.isActive,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDay(null);
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.date || !form.startTime || !form.endTime) {
            toaster.create({ title: "يرجى ملء جميع الحقول", type: "error", duration: 2000 });
            return;
        }
        if (form.startTime >= form.endTime) {
            toaster.create({ title: "وقت البداية يجب أن يكون قبل وقت النهاية", type: "error", duration: 2000 });
            return;
        }
        setIsSaving(true);
        try {
            if (editingDay) {
                await api.put(`/admin/working-days/${editingDay.id}`, form);
                toaster.create({ title: "تم تحديث يوم العمل", type: "success", duration: 2000 });
            } else {
                await api.post("/admin/working-days", {
                    date: form.date,
                    startTime: form.startTime,
                    endTime: form.endTime,
                });
                toaster.create({ title: "تم إضافة يوم العمل", type: "success", duration: 2000 });
            }
            closeModal();
            fetchWorkingDays();
        } catch (error: any) {
            toaster.create({
                title: "خطأ في الحفظ",
                description: error.response?.data?.message || "حدث خطأ",
                type: "error",
                duration: 3000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Toggle active ────────────────────────────────────────────────────────
    const handleToggleActive = async (day: WorkingDay) => {
        try {
            await api.put(`/admin/working-days/${day.id}`, { isActive: !day.isActive });
            toaster.create({
                title: day.isActive ? "تم تعطيل يوم العمل" : "تم تفعيل يوم العمل",
                type: "success",
                duration: 2000,
            });
            fetchWorkingDays();
        } catch (error: any) {
            toaster.create({
                title: "خطأ",
                description: error.response?.data?.message || "حدث خطأ",
                type: "error",
                duration: 3000,
            });
        }
    };

    // ── Stats ────────────────────────────────────────────────────────────────
    const activeCount = workingDays.filter((d) => d.isActive).length;
    const totalSlots = workingDays
        .filter((d) => d.isActive)
        .reduce((sum, d) => sum + genSlots(d.startTime, d.endTime).length, 0);
    const currentMonth = viewDate.getMonth();

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl">
            {/* Header */}
            <Box
                bg="linear-gradient(135deg, #666139 0%, #7a7350 50%, #52b788 100%)"
                py={8}
                px={4}
                className="mt-[180px]"
            >
                <Container maxW="7xl">
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                        <Box>
                            <Heading size="xl" color="white" mb={1}>
                                إدارة ساعات العمل
                            </Heading>
                            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                                <CalendarDays size={18} />
                                <Text>جدولة أيام وأوقات قبول الحجوزات</Text>
                            </Flex>
                        </Box>
                        <Flex gap={3}>
                            <Button
                                variant="ghost"
                                color="white"
                                _hover={{ bg: "whiteAlpha.200" }}
                                onClick={fetchWorkingDays}
                                loading={isLoading}
                            >
                                <RefreshCw size={18} style={{ marginLeft: 6 }} />
                                تحديث
                            </Button>
                            <Button
                                bg="white"
                                color="#666139"
                                _hover={{ bg: "whiteAlpha.900" }}
                                onClick={() => openAddModal()}
                            >
                                <Plus size={18} style={{ marginLeft: 6 }} />
                                إضافة يوم عمل
                            </Button>
                        </Flex>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="7xl" py={8} mt={-6} position="relative" zIndex={1}>
                {/* Stats */}
                <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={8}>
                    <Card.Root bg="white" shadow="md" borderRadius="xl">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="green.50" borderRadius="xl">
                                <CalendarDays size={24} color="#666139" />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">أيام العمل النشطة</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#666139">{activeCount}</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                    <Card.Root bg="white" shadow="md" borderRadius="xl">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="blue.50" borderRadius="xl">
                                <Clock size={24} color="#2b6cb0" />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي المواعيد (Slots)</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#2b6cb0">{totalSlots}</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                    <Card.Root bg="white" shadow="md" borderRadius="xl">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="purple.50" borderRadius="xl">
                                <Calendar size={24} color="#6b46c1" />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي أيام العمل</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#6b46c1">{workingDays.length}</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                </SimpleGrid>

                {/* Calendar Card */}
                <Card.Root bg="white" shadow="md" borderRadius="2xl" overflow="hidden">

                    {/* Calendar Header: Month nav */}
                    <Box
                        bg="linear-gradient(135deg, #666139 0%, #7a7350 100%)"
                        px={3}
                        py={2}
                    >
                        <Flex align="center" justify="space-between">
                            <IconButton
                                aria-label="الشهر السابق"
                                size="xs"
                                variant="ghost"
                                color="white"
                                _hover={{ bg: "whiteAlpha.200" }}
                                onClick={prevMonth}
                            >
                                <ChevronRight size={14} />
                            </IconButton>

                            <Flex align="center" gap={2}>
                                <Text fontSize="sm" fontWeight="bold" color="white">
                                    {monthLabel}
                                </Text>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    color="white"
                                    borderColor="whiteAlpha.500"
                                    _hover={{ bg: "whiteAlpha.200" }}
                                    onClick={goToday}
                                    borderRadius="full"
                                    px={2}
                                    py={1}
                                    minH="auto"
                                    fontSize="xs"
                                >
                                    اليوم
                                </Button>
                            </Flex>

                            <IconButton
                                aria-label="الشهر التالي"
                                size="xs"
                                variant="ghost"
                                color="white"
                                _hover={{ bg: "whiteAlpha.200" }}
                                onClick={nextMonth}
                            >
                                <ChevronLeft size={14} />
                            </IconButton>
                        </Flex>
                    </Box>

                    {/* Weekday Headers */}
                    <Box
                        display="grid"
                        gridTemplateColumns="repeat(7, 1fr)"
                        bg="#fdfbf7"
                        borderBottom="1px solid"
                        borderColor="gray.100"
                    >
                        {AR_DAYS.map((d) => (
                            <Box key={d} textAlign="center" py={1} px={0.5}>
                                <Text
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color="#666139"
                                >
                                    {d}
                                </Text>
                            </Box>
                        ))}
                    </Box>

                    {/* Calendar Grid */}
                    {isLoading ? (
                        <Flex justify="center" align="center" minH="220px">
                            <Spinner size="lg" color="#666139" />
                        </Flex>
                    ) : (
                        <Box>
                            {calendarWeeks.map((week, wi) => (
                                <Box
                                    key={wi}
                                    display="grid"
                                    gridTemplateColumns="repeat(7, 1fr)"
                                    borderBottom={wi < calendarWeeks.length - 1 ? "1px solid" : "none"}
                                    borderColor="gray.100"
                                >
                                    {week.map((date, di) => {
                                        const dateStr = date.toISOString().split("T")[0];
                                        const workDay = dayMap[dateStr];
                                        const isToday = dateStr === today;
                                        const isPast = dateStr < today;
                                        const isCurrentMonth = date.getMonth() === currentMonth;
                                        const slots = workDay ? genSlots(workDay.startTime, workDay.endTime) : [];

                                        // Border between days
                                        const hasBorderRight = di < 6;

                                        return (
                                            <Box
                                                key={dateStr}
                                                borderRight={hasBorderRight ? "1px solid" : "none"}
                                                borderColor="gray.100"
                                                p={1}
                                                minH="68px"
                                                position="relative"
                                                bg={
                                                    isToday
                                                        ? "green.50"
                                                        : !isCurrentMonth
                                                            ? "gray.50"
                                                            : workDay
                                                                ? workDay.isActive
                                                                    ? "white"
                                                                    : "red.50"
                                                                : "white"
                                                }
                                                transition="background 0.15s"
                                                cursor={isCurrentMonth ? "pointer" : "default"}
                                                _hover={
                                                    isCurrentMonth
                                                        ? { bg: workDay ? (workDay.isActive ? "green.50" : "red.50") : "gray.50" }
                                                        : {}
                                                }
                                                onClick={() => {
                                                    if (!isCurrentMonth) return;
                                                    if (workDay) openEditModal(workDay);
                                                    else openAddModal(dateStr);
                                                }}
                                            >
                                                {/* Day number */}
                                                <Flex justify="space-between" align="flex-start" mb={0.5}>
                                                    <Box
                                                        w={6}
                                                        h={6}
                                                        borderRadius="full"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        bg={isToday ? "#666139" : "transparent"}
                                                        flexShrink={0}
                                                    >
                                                        <Text
                                                            fontSize="xs"
                                                            fontWeight={isToday ? "bold" : isCurrentMonth ? "medium" : "normal"}
                                                            color={
                                                                isToday
                                                                    ? "white"
                                                                    : !isCurrentMonth
                                                                        ? "gray.300"
                                                                        : isPast
                                                                            ? "gray.400"
                                                                            : "gray.700"
                                                            }
                                                        >
                                                            {date.getDate()}
                                                        </Text>
                                                    </Box>

                                                    {/* Status dot */}
                                                    {workDay && isCurrentMonth && (
                                                        <Box
                                                            w={1.5}
                                                            h={1.5}
                                                            borderRadius="full"
                                                            bg={workDay.isActive ? "#666139" : "red.400"}
                                                            mt={0.5}
                                                        />
                                                    )}
                                                </Flex>

                                                {/* Working day info */}
                                                {workDay && isCurrentMonth && (
                                                    <Box>
                                                        {/* Time range pill */}
                                                        <Box
                                                            bg={workDay.isActive ? "#666139" : "red.500"}
                                                            borderRadius="md"
                                                            px={1.5}
                                                            py={0.5}
                                                            mb={1}
                                                        >
                                                            <Flex align="center" gap={1}>
                                                                <Clock size={10} color="white" />
                                                                <Text fontSize="10px" color="white" fontWeight="bold" lineHeight={1.2}>
                                                                    {workDay.startTime} — {workDay.endTime}
                                                                </Text>
                                                            </Flex>
                                                        </Box>

                                                        {/* Slots count */}
                                                        <Text fontSize="9px" color={workDay.isActive ? "green.700" : "red.600"} fontWeight="medium">
                                                            {slots.length} موعد
                                                        </Text>

                                                        {/* Status badge */}
                                                        <Box
                                                            display="inline-block"
                                                            bg={workDay.isActive ? "gray.100" : "red.100"}
                                                            color={workDay.isActive ? "green.700" : "red.600"}
                                                            fontSize="8px"
                                                            fontWeight="bold"
                                                            px={1}
                                                            py={0.5}
                                                            borderRadius="sm"
                                                            mt={0.5}
                                                        >
                                                            {workDay.isActive ? "نشط" : "معطّل"}
                                                        </Box>

                                                        {/* Quick toggle button */}
                                                        <Box
                                                            position="absolute"
                                                            bottom={1}
                                                            left={1}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleActive(workDay);
                                                            }}
                                                        >
                                                            <IconButton
                                                                aria-label={workDay.isActive ? "تعطيل" : "تفعيل"}
                                                                size="2xs"
                                                                variant="ghost"
                                                                colorPalette={workDay.isActive ? "red" : "green"}
                                                                borderRadius="full"
                                                                opacity={0.7}
                                                                _hover={{ opacity: 1 }}
                                                            >
                                                                {workDay.isActive ? <XCircle size={12} /> : <CheckCircle size={12} />}
                                                            </IconButton>
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Empty current-month day — show hint on hover */}
                                                {!workDay && isCurrentMonth && (
                                                    <Flex
                                                        align="center"
                                                        justify="center"
                                                        h="60px"
                                                        opacity={0}
                                                        _groupHover={{ opacity: 1 }}
                                                        transition="opacity 0.15s"
                                                        role="group"
                                                    >
                                                        <Box
                                                            w={6}
                                                            h={6}
                                                            borderRadius="full"
                                                            border="1.5px dashed"
                                                            borderColor="gray.300"
                                                            display="flex"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                        >
                                                            <Plus size={10} color="#94a3b8" />
                                                        </Box>
                                                    </Flex>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Calendar Footer Legend */}
                    <Box px={6} py={3} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
                        <Flex gap={5} align="center" wrap="wrap">
                            <Flex align="center" gap={1.5}>
                                <Box w={3} h={3} borderRadius="full" bg="#666139" />
                                <Text fontSize="xs" color="gray.600">يوم عمل نشط</Text>
                            </Flex>
                            <Flex align="center" gap={1.5}>
                                <Box w={3} h={3} borderRadius="full" bg="red.400" />
                                <Text fontSize="xs" color="gray.600">يوم عمل معطّل</Text>
                            </Flex>
                            <Flex align="center" gap={1.5}>
                                <Box w={3} h={3} borderRadius="full" bg="#666139" border="2px solid" borderColor="white" boxShadow="0 0 0 2px #666139" />
                                <Text fontSize="xs" color="gray.600">اليوم</Text>
                            </Flex>
                            <Flex align="center" gap={1.5}>
                                <Box w={3} h={3} borderRadius="full" bg="gray.200" />
                                <Text fontSize="xs" color="gray.600">خارج الشهر الحالي</Text>
                            </Flex>
                            <Text fontSize="xs" color="gray.400" mr="auto">
                                اضغط على أي يوم لإضافة أو تعديل ساعات العمل
                            </Text>
                        </Flex>
                    </Box>
                </Card.Root>
            </Container>

            {/* Add/Edit Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
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
                            width={{ base: "90%", md: "480px" }}
                            maxH="90vh"
                            outline="none"
                        >
                            {/* Modal Header */}
                            <Box
                                bg="linear-gradient(135deg, #666139 0%, #7a7350 100%)"
                                px={6}
                                py={4}
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Flex align="center" gap={2}>
                                    <CalendarDays size={20} color="white" />
                                    <Text fontSize="lg" color="white" fontWeight="bold">
                                        {editingDay ? "تعديل يوم عمل" : "إضافة يوم عمل جديد"}
                                    </Text>
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
                                        onClick={closeModal}
                                    >
                                        ✕
                                    </Button>
                                </Dialog.CloseTrigger>
                            </Box>

                            {/* Selected date display */}
                            {form.date && (
                                <Box px={6} pt={4} pb={0}>
                                    <Box
                                        bg="green.50"
                                        borderRadius="xl"
                                        px={4}
                                        py={3}
                                        border="1px solid"
                                        borderColor="gray.100"
                                    >
                                        <Flex align="center" gap={2}>
                                            <Calendar size={16} color="#666139" />
                                            <Text fontWeight="bold" color="#666139" fontSize="md">
                                                {new Date(form.date + "T00:00:00").toLocaleDateString("ar-EG", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </Text>
                                        </Flex>
                                    </Box>
                                </Box>
                            )}

                            <Box p={6}>
                                <VStack gap={4} align="stretch">
                                    {/* Date (hidden if editing — date is fixed) */}
                                    {!editingDay && (
                                        <Box>
                                            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">التاريخ</Text>
                                            <Input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                                bg="gray.50"
                                                borderColor="gray.200"
                                                _focus={{ borderColor: "#666139", bg: "white" }}
                                            />
                                        </Box>
                                    )}

                                    {/* Times */}
                                    <Flex gap={3}>
                                        <Box flex={1}>
                                            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                                وقت البداية
                                            </Text>
                                            <Input
                                                type="time"
                                                value={form.startTime}
                                                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                                                bg="gray.50"
                                                borderColor="gray.200"
                                                _focus={{ borderColor: "#666139", bg: "white" }}
                                                step="3600"
                                            />
                                        </Box>
                                        <Box flex={1}>
                                            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                                وقت النهاية
                                            </Text>
                                            <Input
                                                type="time"
                                                value={form.endTime}
                                                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                                                bg="gray.50"
                                                borderColor="gray.200"
                                                _focus={{ borderColor: "#666139", bg: "white" }}
                                                step="3600"
                                            />
                                        </Box>
                                    </Flex>

                                    {/* Preview Slots */}
                                    {form.startTime && form.endTime && form.startTime < form.endTime && (
                                        <Box bg="green.50" borderRadius="xl" p={4} border="1px solid" borderColor="gray.100">
                                            <Flex align="center" gap={2} mb={3}>
                                                <Clock size={14} color="#666139" />
                                                <Text fontSize="sm" color="#666139" fontWeight="bold">
                                                    المواعيد المتوقعة ({genSlots(form.startTime, form.endTime).length} موعد)
                                                </Text>
                                            </Flex>
                                            <Flex gap={2} flexWrap="wrap">
                                                {genSlots(form.startTime, form.endTime).map((s) => (
                                                    <Badge key={s} bg="#666139" color="white" variant="subtle" px={2} py={1} borderRadius="md">
                                                        {s}
                                                    </Badge>
                                                ))}
                                            </Flex>
                                            <Text fontSize="xs" color="gray.500" mt={2}>
                                                كل موعد يستوعب حتى 10 حجوزات — إجمالي {genSlots(form.startTime, form.endTime).length * 10} حجز كحد أقصى
                                            </Text>
                                        </Box>
                                    )}

                                    {/* isActive (edit only) */}
                                    {editingDay && (
                                        <Flex align="center" justify="space-between" bg="gray.50" borderRadius="xl" p={4}>
                                            <Text fontSize="sm" color="gray.700" fontWeight="medium">
                                                حالة يوم العمل
                                            </Text>
                                            <Button
                                                size="sm"
                                                colorPalette={form.isActive ? "green" : "red"}
                                                variant="subtle"
                                                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                                                borderRadius="full"
                                                px={4}
                                            >
                                                {form.isActive ? (
                                                    <><CheckCircle size={14} style={{ marginLeft: 6 }} /> نشط</>
                                                ) : (
                                                    <><XCircle size={14} style={{ marginLeft: 6 }} /> معطّل</>
                                                )}
                                            </Button>
                                        </Flex>
                                    )}

                                    {/* Actions */}
                                    <Flex gap={3} mt={2}>
                                        <Button
                                            flex={1}
                                            onClick={handleSave}
                                            bg="#666139"
                                            color="white"
                                            _hover={{ bg: "#1b4332" }}
                                            loading={isSaving}
                                            borderRadius="xl"
                                        >
                                            حفظ
                                        </Button>
                                        <Button flex={1} onClick={closeModal} variant="outline" colorPalette="gray" borderRadius="xl">
                                            إلغاء
                                        </Button>
                                    </Flex>
                                </VStack>
                            </Box>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
