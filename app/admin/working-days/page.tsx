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
import {
  canChooseDoctor,
  getCurrentDoctorId,
  getCurrentRole,
  setSelectedDoctorId,
} from "@/lib/doctor-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayDate() {
  return formatDateLocal(new Date());
}

/** Local YYYY-MM-DD without UTC shift */
function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** أول ساعة بداية — آخر ساعة نهاية (حصرية؛ 24 = منتصف الليل 12 ص) */
const WORK_HOUR_MIN = 6;
const WORK_HOUR_START_MAX = 23;
const WORK_HOUR_END_MAX = 24;

/** كل الساعات من 6 ص حتى 12 ص (منتصف الليل) */
const ALL_WORK_HOURS = Array.from(
  { length: WORK_HOUR_END_MAX - WORK_HOUR_MIN + 1 },
  (_, i) => WORK_HOUR_MIN + i,
);
/** ساعات البداية: 6 ص … 11 م */
const START_HOURS = ALL_WORK_HOURS.filter(
  (h) => h >= WORK_HOUR_MIN && h <= WORK_HOUR_START_MAX,
);
/** ساعات النهاية: 7 ص … 12 ص */
const END_HOURS = ALL_WORK_HOURS.filter((h) => h > WORK_HOUR_MIN);

function hourToValue(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function parseStartHour(value: string): number {
  const raw = Number(String(value).split(":")[0]);
  if (Number.isNaN(raw)) return 9;
  const h = raw === 24 ? WORK_HOUR_START_MAX : raw;
  return Math.min(WORK_HOUR_START_MAX, Math.max(WORK_HOUR_MIN, h));
}

function parseEndHour(value: string): number {
  const raw = Number(String(value).split(":")[0]);
  if (Number.isNaN(raw)) return 17;
  if (raw === 0 || raw === 24) return WORK_HOUR_END_MAX;
  return Math.min(WORK_HOUR_END_MAX, Math.max(WORK_HOUR_MIN + 1, raw));
}

/** @deprecated استخدم parseStartHour — للتوافق مع أي استدعاء قديم */
function parseHour(value: string): number {
  return parseStartHour(value);
}

function slotToHour(slot: string): number {
  return Number(slot.split(":")[0]);
}

function normalizeStartTime(value: string): string {
  return hourToValue(parseStartHour(value));
}

function normalizeEndTime(value: string): string {
  return hourToValue(parseEndHour(value));
}

function formatHourAr(hhmm: string): string {
  const raw = Number(String(hhmm).split(":")[0]);
  if (raw === 0 || raw === 24) return "12 ص";
  const h = raw;
  const period = h >= 12 ? "م" : "ص";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${period}`;
}

/** تسمية واضحة مرتبة زمنياً (24 ساعة + ص/م) */
function formatHourLabel(h: number): string {
  if (h === WORK_HOUR_END_MAX) return "24:00  12 ص";
  return `${hourToValue(h).slice(0, 5)}  ${formatHourAr(hourToValue(h))}`;
}

function genSlots(start: string, end: string): string[] {
  if (!start || !end) return [];
  const slots: string[] = [];
  let sh = parseStartHour(start);
  const eh = parseEndHour(end);
  while (sh < eh) {
    slots.push(hourToValue(sh));
    sh++;
  }
  return slots;
}

function isValidTimeRange(start: string, end: string): boolean {
  return parseStartHour(start) < parseEndHour(end);
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
const AR_DAYS = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

/** أسماء أيام مختصرة للشاشات الضيقة جداً */
const AR_DAYS_SHORT = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

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

function HourPickerGrid({
  label,
  hint,
  value,
  hours,
  onChange,
  isHourDisabled,
}: {
  label: string;
  hint?: string;
  value: string;
  hours: number[];
  onChange: (value: string) => void;
  isHourDisabled?: (h: number) => boolean;
}) {
  return (
    <Box flex={1} minW={0}>
      <Text fontSize="sm" color="gray.600" mb={1} fontWeight="medium">
        {label}
      </Text>
      {hint && (
        <Text fontSize="xs" color="gray.400" mb={2}>
          {hint}
        </Text>
      )}
      <Box
        maxH="200px"
        overflowY="auto"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="xl"
        p={2}
        bg="white"
        css={{
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            background: "#c9b97a",
            borderRadius: "3px",
          },
        }}
      >
        <SimpleGrid columns={{ base: 3, sm: 4 }} gap={1.5}>
          {hours.map((h) => {
            const hourValue = hourToValue(h);
            const selected = value === hourValue;
            const disabled = isHourDisabled?.(h) ?? false;
            return (
              <Button
                key={h}
                size="sm"
                variant={selected ? "solid" : "outline"}
                bg={selected ? "#666139" : "white"}
                color={selected ? "white" : disabled ? "gray.400" : "#2d3748"}
                borderColor={selected ? "#666139" : "gray.200"}
                opacity={disabled ? 0.45 : 1}
                cursor={disabled ? "not-allowed" : "pointer"}
                disabled={disabled}
                onClick={() => !disabled && onChange(hourValue)}
                borderRadius="lg"
                fontWeight={selected ? "bold" : "medium"}
                fontSize="xs"
                px={1}
                py={2}
                h="auto"
                minH="40px"
                flexDirection="column"
                lineHeight="1.3"
                whiteSpace="nowrap"
                _hover={
                  disabled
                    ? {}
                    : selected
                      ? { bg: "#4a452a" }
                      : { bg: "#f0ebe0", borderColor: "#666139" }
                }
              >
                {formatHourAr(hourValue)}
              </Button>
            );
          })}
        </SimpleGrid>
      </Box>
    </Box>
  );
}

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
    return formatDateLocal(d);
  }, [viewDate]);

  const rangeEnd = useMemo(() => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1, 0);
    return formatDateLocal(d);
  }, [viewDate]);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<WorkingDay | null>(null);
  const [form, setForm] = useState<WorkingDayFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [doctors, setDoctors] = useState<
    Array<{ id: number; name?: string; user?: { name?: string } }>
  >([]);
  const [selectedDoctorId, setDoctorId] = useState<number>(0);
  const [canSelectDoctor, setCanSelectDoctor] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);

  useEffect(() => {
    const role = getCurrentRole();
    const canSelect = canChooseDoctor(role);
    setCanSelectDoctor(canSelect);
    const current = getCurrentDoctorId();
    if (current) setDoctorId(current);
    setRoleResolved(true);
  }, []);

  useEffect(() => {
    if (!canSelectDoctor) return;
    const loadDoctors = async () => {
      try {
        const res = await api.get("/doctors");
        const list = Array.isArray(res.data) ? res.data : (res.data?.doctors ?? []);
        const arr = Array.isArray(list) ? list : [];
        setDoctors(arr);
        if (arr.length === 0) return;
        setDoctorId((prev) => {
          const ids = new Set(arr.map((d) => d.id));
          if (prev > 0 && ids.has(prev)) return prev;
          return arr[0].id;
        });
      } catch {
        setDoctors([]);
      }
    };
    loadDoctors();
  }, [canSelectDoctor]);

  useEffect(() => {
    if (!canSelectDoctor) return;
    if (selectedDoctorId > 0) {
      setSelectedDoctorId(selectedDoctorId);
    }
  }, [canSelectDoctor, selectedDoctorId]);

  // ── API ──────────────────────────────────────────────────────────────────
  const fetchWorkingDays = async () => {
    if (!roleResolved) return;
    if (canSelectDoctor && !selectedDoctorId) {
      setWorkingDays([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.get("/admin/working-days", {
        params: {
          startDate: rangeStart,
          endDate: rangeEnd,
          ...(selectedDoctorId ? { doctorId: selectedDoctorId } : {}),
        },
      });
      const data = response.data;
      setWorkingDays(Array.isArray(data) ? data : (data.workingDays ?? []));
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
  }, [rangeStart, rangeEnd, selectedDoctorId, roleResolved]);

  // ── Calendar grid ────────────────────────────────────────────────────────
  // Build calendar weeks for the current month view
  const calendarWeeks = useMemo(() => {
    // First day of month
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    // Start from the Saturday of the week containing firstDay
    const gridStart = getWeekStart(firstDay);

    // Last day of month
    const lastDay = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0,
    );
    const gridEnd = new Date(lastDay);
    // extend to end of Friday of that week
    const lastOffset = (gridEnd.getDay() + 2) % 7; // days until Friday
    gridEnd.setDate(
      gridEnd.getDate() + ((lastOffset === 0 ? 0 : 7 - lastOffset) % 7),
    );

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
    workingDays.forEach((d) => {
      m[d.date] = d;
    });
    return m;
  }, [workingDays]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () =>
    setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const monthLabel = viewDate.toLocaleDateString("ar-EG", {
    month: "long",
    year: "numeric",
  });

  const startHour = parseStartHour(form.startTime);

  const timeRangeValid = isValidTimeRange(form.startTime, form.endTime);
  const previewSlots = timeRangeValid
    ? genSlots(form.startTime, form.endTime)
    : [];

  const handleStartHourChange = (newStart: string) => {
    setForm((f) => {
      const next = { ...f, startTime: newStart };
      if (!isValidTimeRange(newStart, f.endTime)) {
        const endH = Math.min(parseStartHour(newStart) + 1, WORK_HOUR_END_MAX);
        next.endTime = hourToValue(endH);
      }
      return next;
    });
  };

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openAddModal = (prefillDate?: string) => {
    setEditingDay(null);
    setForm({ ...emptyForm, date: prefillDate || today });
    setIsModalOpen(true);
  };

  const openEditModal = (day: WorkingDay) => {
    setEditingDay(day);
    const startTime = normalizeStartTime(day.startTime);
    let endTime = normalizeEndTime(day.endTime);
    if (!isValidTimeRange(startTime, endTime)) {
      endTime = hourToValue(
        Math.min(parseStartHour(startTime) + 1, WORK_HOUR_END_MAX),
      );
    }
    setForm({
      date: day.date,
      startTime,
      endTime,
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
      toaster.create({
        title: "يرجى ملء جميع الحقول",
        type: "error",
        duration: 2000,
      });
      return;
    }
    const startTime = normalizeStartTime(form.startTime);
    const endTime = normalizeEndTime(form.endTime);
    if (!isValidTimeRange(startTime, endTime)) {
      toaster.create({
        title: "وقت النهاية يجب أن يكون بعد وقت البداية بساعة على الأقل",
        type: "error",
        duration: 2500,
      });
      return;
    }
    setIsSaving(true);
    if (!selectedDoctorId) {
      toaster.create({
        title: "اختر الطبيب أولاً",
        type: "warning",
        duration: 2000,
      });
      setIsSaving(false);
      return;
    }
    try {
      if (editingDay) {
        await api.put(`/admin/working-days/${editingDay.id}`, {
          ...form,
          startTime,
          endTime,
          doctorId: selectedDoctorId,
        });
        toaster.create({
          title: "تم تحديث يوم العمل",
          type: "success",
          duration: 2000,
        });
      } else {
        await api.post("/admin/working-days", {
          date: form.date,
          startTime,
          endTime,
          doctorId: selectedDoctorId,
        });
        toaster.create({
          title: "تم إضافة يوم العمل",
          type: "success",
          duration: 2000,
        });
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
      await api.put(`/admin/working-days/${day.id}`, {
        isActive: !day.isActive,
        ...(selectedDoctorId ? { doctorId: selectedDoctorId } : {}),
      });
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
        py={{ base: 5, md: 8 }}
        px={{ base: 3, md: 4 }}
      >
        <Container maxW="7xl" px={{ base: 0, sm: 4 }}>
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            flexWrap="wrap"
            gap={{ base: 4, md: 4 }}
            direction={{ base: "column", md: "row" }}
          >
            <Box minW={0}>
              <Heading
                size={{ base: "lg", md: "xl" }}
                color="white"
                mb={1}
                lineHeight="shorter"
              >
                إدارة ساعات العمل
              </Heading>
              <Flex
                align="center"
                gap={2}
                color="whiteAlpha.900"
                fontSize={{ base: "sm", md: "md" }}
                flexWrap="wrap"
              >
                <CalendarDays size={18} style={{ flexShrink: 0 }} />
                <Text>جدولة أيام وأوقات قبول الحجوزات</Text>
              </Flex>
            </Box>
            <Flex
              gap={3}
              w={{ base: "full", md: "auto" }}
              flexDir={{ base: "column", sm: "row" }}
              flexShrink={0}
            >
              {canSelectDoctor && (
                <Box
                  bg="whiteAlpha.200"
                  border="1px solid"
                  borderColor="whiteAlpha.400"
                  borderRadius="lg"
                  px={2}
                >
                  <select
                    value={selectedDoctorId || doctors[0]?.id || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setDoctorId(id);
                      setSelectedDoctorId(Number.isNaN(id) ? null : id);
                    }}
                    style={{
                      minWidth: "180px",
                      padding: "8px",
                      background: "transparent",
                      color: "white",
                      border: "none",
                      outline: "none",
                    }}
                  >
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id} style={{ color: "#111827" }}>
                        {doc.user?.name || doc.name || `Doctor #${doc.id}`}
                      </option>
                    ))}
                  </select>
                </Box>
              )}
              <Button
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={fetchWorkingDays}
                loading={isLoading}
                w={{ base: "full", sm: "auto" }}
                size={{ base: "md", md: "md" }}
              >
                <RefreshCw size={18} style={{ marginLeft: 6 }} />
                تحديث
              </Button>
              <Button
                bg="white"
                color="#666139"
                _hover={{ bg: "whiteAlpha.900" }}
                onClick={() => openAddModal()}
                w={{ base: "full", sm: "auto" }}
              >
                <Plus size={18} style={{ marginLeft: 6 }} />
                إضافة يوم عمل
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container
        maxW="7xl"
        py={{ base: 4, md: 8 }}
        px={{ base: 3, md: 6 }}
        mt={{ base: -4, md: -6 }}
        position="relative"
        zIndex={1}
      >
        {/* Stats */}
        <SimpleGrid
          columns={{ base: 1, sm: 3 }}
          gap={{ base: 3, md: 4 }}
          mb={{ base: 6, md: 8 }}
        >
          <Card.Root bg="white" shadow="md" borderRadius="xl">
            <Card.Body
              p={{ base: 4, md: 5 }}
              display="flex"
              flexDirection="row"
              alignItems="center"
              gap={{ base: 3, md: 4 }}
            >
              <Box p={3} bg="green.50" borderRadius="xl">
                <CalendarDays size={24} color="#666139" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  أيام العمل النشطة
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#666139">
                  {activeCount}
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
          <Card.Root bg="white" shadow="md" borderRadius="xl">
            <Card.Body
              p={{ base: 4, md: 5 }}
              display="flex"
              flexDirection="row"
              alignItems="center"
              gap={{ base: 3, md: 4 }}
            >
              <Box p={3} bg="blue.50" borderRadius="xl">
                <Clock size={24} color="#2b6cb0" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  إجمالي المواعيد (Slots)
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#2b6cb0">
                  {totalSlots}
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
          <Card.Root bg="white" shadow="md" borderRadius="xl">
            <Card.Body
              p={{ base: 4, md: 5 }}
              display="flex"
              flexDirection="row"
              alignItems="center"
              gap={{ base: 3, md: 4 }}
            >
              <Box p={3} bg="purple.50" borderRadius="xl">
                <Calendar size={24} color="#6b46c1" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  إجمالي أيام العمل
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#6b46c1">
                  {workingDays.length}
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Calendar Card */}
        <Card.Root
          bg="white"
          shadow="md"
          borderRadius={{ base: "xl", md: "2xl" }}
          overflow="hidden"
        >
          {/* Calendar Header: Month nav */}
          <Box
            bg="linear-gradient(135deg, #666139 0%, #7a7350 100%)"
            px={{ base: 2, md: 3 }}
            py={{ base: 2, md: 2 }}
          >
            <Flex align="center" justify="space-between" gap={1} minW={0}>
              <IconButton
                aria-label="الشهر السابق"
                size="xs"
                variant="ghost"
                color="white"
                flexShrink={0}
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={prevMonth}
              >
                <ChevronRight size={14} />
              </IconButton>

              <Flex
                align="center"
                gap={{ base: 1, sm: 2 }}
                minW={0}
                justify="center"
                flex={1}
              >
                <Text
                  fontSize={{ base: "xs", sm: "sm" }}
                  fontWeight="bold"
                  color="white"
                  textAlign="center"
                  lineClamp={2}
                  lineHeight="short"
                >
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
                  flexShrink={0}
                >
                  اليوم
                </Button>
              </Flex>

              <IconButton
                aria-label="الشهر التالي"
                size="xs"
                variant="ghost"
                color="white"
                flexShrink={0}
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={nextMonth}
              >
                <ChevronLeft size={14} />
              </IconButton>
            </Flex>
          </Box>

          {/* Calendar: تمرير أفقي على الموبايل حتى تبقى الخلايا قابلة للقراءة */}
          <Box
            overflowX={{ base: "auto", md: "visible" }}
            w="full"
            css={{ WebkitOverflowScrolling: "touch" }}
          >
            <Box minW={{ base: "520px", md: "auto" }} w="full">
              {/* Weekday Headers */}
              <Box
                display="grid"
                gridTemplateColumns="repeat(7, 1fr)"
                bg="#fdfbf7"
                borderBottom="1px solid"
                borderColor="gray.100"
              >
                {AR_DAYS.map((d, i) => (
                  <Box
                    key={d}
                    textAlign="center"
                    py={1}
                    px={{ base: 0, sm: 0.5 }}
                  >
                    <Text
                      display={{ base: "none", sm: "block" }}
                      fontSize="xs"
                      fontWeight="bold"
                      color="#666139"
                    >
                      {d}
                    </Text>
                    <Text
                      display={{ base: "block", sm: "none" }}
                      fontSize="10px"
                      fontWeight="bold"
                      color="#666139"
                    >
                      {AR_DAYS_SHORT[i]}
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
                      borderBottom={
                        wi < calendarWeeks.length - 1 ? "1px solid" : "none"
                      }
                      borderColor="gray.100"
                    >
                      {week.map((date, di) => {
                        const dateStr = formatDateLocal(date);
                        const workDay = dayMap[dateStr];
                        const isToday = dateStr === today;
                        const isPast = dateStr < today;
                        const isCurrentMonth = date.getMonth() === currentMonth;
                        const slots = workDay
                          ? genSlots(workDay.startTime, workDay.endTime)
                          : [];

                        // Border between days
                        const hasBorderRight = di < 6;

                        return (
                          <Box
                            key={dateStr}
                            borderRight={hasBorderRight ? "1px solid" : "none"}
                            borderColor="gray.100"
                            p={{ base: 0.5, sm: 1 }}
                            minH={{ base: "72px", sm: "68px" }}
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
                                ? {
                                    bg: workDay
                                      ? workDay.isActive
                                        ? "green.50"
                                        : "red.50"
                                      : "gray.50",
                                  }
                                : {}
                            }
                            onClick={() => {
                              if (!isCurrentMonth) return;
                              if (workDay) openEditModal(workDay);
                              else openAddModal(dateStr);
                            }}
                          >
                            {/* Day number */}
                            <Flex
                              justify="space-between"
                              align="flex-start"
                              mb={0.5}
                            >
                              <Box
                                w={{ base: 5, sm: 6 }}
                                h={{ base: 5, sm: 6 }}
                                borderRadius="full"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                bg={isToday ? "#666139" : "transparent"}
                                flexShrink={0}
                              >
                                <Text
                                  fontSize={{ base: "10px", sm: "xs" }}
                                  fontWeight={
                                    isToday
                                      ? "bold"
                                      : isCurrentMonth
                                        ? "medium"
                                        : "normal"
                                  }
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
                                  px={{ base: 1, sm: 1.5 }}
                                  py={0.5}
                                  mb={1}
                                >
                                  <Flex align="center" gap={0.5}>
                                    <Clock size={10} color="white" />
                                    <Text
                                      fontSize={{ base: "9px", sm: "10px" }}
                                      color="white"
                                      fontWeight="bold"
                                      lineHeight={1.2}
                                      lineClamp={1}
                                    >
                                      {formatHourAr(workDay.startTime)} —{" "}
                                      {formatHourAr(workDay.endTime)}
                                    </Text>
                                  </Flex>
                                </Box>

                                {/* Slots count */}
                                <Text
                                  fontSize="9px"
                                  color={
                                    workDay.isActive ? "green.700" : "red.600"
                                  }
                                  fontWeight="medium"
                                  display={{ base: "none", sm: "block" }}
                                >
                                  {slots.length} موعد
                                </Text>

                                {/* Status badge */}
                                <Box
                                  display={{ base: "none", sm: "inline-block" }}
                                  bg={workDay.isActive ? "gray.100" : "red.100"}
                                  color={
                                    workDay.isActive ? "green.700" : "red.600"
                                  }
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
                                    aria-label={
                                      workDay.isActive ? "تعطيل" : "تفعيل"
                                    }
                                    size="2xs"
                                    variant="ghost"
                                    colorPalette={
                                      workDay.isActive ? "red" : "green"
                                    }
                                    borderRadius="full"
                                    opacity={0.7}
                                    _hover={{ opacity: 1 }}
                                  >
                                    {workDay.isActive ? (
                                      <XCircle size={12} />
                                    ) : (
                                      <CheckCircle size={12} />
                                    )}
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
            </Box>
          </Box>

          {/* Calendar Footer Legend */}
          <Box
            px={{ base: 3, md: 6 }}
            py={{ base: 2, md: 3 }}
            bg="gray.50"
            borderTop="1px solid"
            borderColor="gray.100"
          >
            <Flex
              gap={{ base: 3, md: 5 }}
              align={{ base: "stretch", md: "center" }}
              wrap="wrap"
              direction={{ base: "column", md: "row" }}
            >
              <Flex align="center" gap={1.5}>
                <Box w={3} h={3} borderRadius="full" bg="#666139" />
                <Text fontSize="xs" color="gray.600">
                  يوم عمل نشط
                </Text>
              </Flex>
              <Flex align="center" gap={1.5}>
                <Box w={3} h={3} borderRadius="full" bg="red.400" />
                <Text fontSize="xs" color="gray.600">
                  يوم عمل معطّل
                </Text>
              </Flex>
              <Flex align="center" gap={1.5}>
                <Box
                  w={3}
                  h={3}
                  borderRadius="full"
                  bg="#666139"
                  border="2px solid"
                  borderColor="white"
                  boxShadow="0 0 0 2px #666139"
                />
                <Text fontSize="xs" color="gray.600">
                  اليوم
                </Text>
              </Flex>
              <Flex align="center" gap={1.5}>
                <Box w={3} h={3} borderRadius="full" bg="gray.200" />
                <Text fontSize="xs" color="gray.600">
                  خارج الشهر الحالي
                </Text>
              </Flex>
              <Text
                fontSize="xs"
                color="gray.400"
                w={{ base: "100%", md: "auto" }}
                ml={{ base: 0, md: "auto" }}
              >
                اضغط على أي يوم لإضافة أو تعديل ساعات العمل
              </Text>
            </Flex>
          </Box>
        </Card.Root>
      </Container>

      {/* Add/Edit Modal */}
      <Dialog.Root
        open={isModalOpen}
        onOpenChange={(e) => !e.open && closeModal()}
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
            padding={{ base: 2, md: 4 }}
          >
            <Dialog.Content
              dir="rtl"
              bg="white"
              borderRadius={{ base: "xl", md: "2xl" }}
              overflow="hidden"
              boxShadow="2xl"
              width={{ base: "100%", sm: "95%", md: "560px" }}
              maxW={{ base: "calc(100vw - 16px)", md: "560px" }}
              maxH="90vh"
              outline="none"
            >
              {/* Modal Header */}
              <Box
                bg="linear-gradient(135deg, #666139 0%, #7a7350 100%)"
                px={{ base: 4, md: 6 }}
                py={{ base: 3, md: 4 }}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                minW={0}
              >
                <Flex align="center" gap={2} minW={0}>
                  <CalendarDays
                    size={20}
                    color="white"
                    style={{ flexShrink: 0 }}
                  />
                  <Text
                    fontSize={{ base: "md", md: "lg" }}
                    color="white"
                    fontWeight="bold"
                    lineClamp={2}
                    lineHeight="short"
                  >
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
                <Box px={{ base: 4, md: 6 }} pt={4} pb={0}>
                  <Box
                    bg="green.50"
                    borderRadius="xl"
                    px={{ base: 3, md: 4 }}
                    py={3}
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Flex align="center" gap={2} minW={0}>
                      <Calendar
                        size={16}
                        color="#666139"
                        style={{ flexShrink: 0 }}
                      />
                      <Text
                        fontWeight="bold"
                        color="#666139"
                        fontSize={{ base: "sm", md: "md" }}
                        lineHeight="short"
                      >
                        {new Date(form.date + "T00:00:00").toLocaleDateString(
                          "ar-EG",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </Text>
                    </Flex>
                  </Box>
                </Box>
              )}

              <Box
                p={{ base: 4, md: 6 }}
                overflowY="auto"
                maxH="calc(90vh - 140px)"
              >
                <VStack gap={4} align="stretch">
                  {/* Date (hidden if editing — date is fixed) */}
                  {!editingDay && (
                    <Box>
                      <Text
                        fontSize="sm"
                        color="gray.600"
                        mb={2}
                        fontWeight="medium"
                      >
                        التاريخ
                      </Text>
                      <Input
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, date: e.target.value }))
                        }
                        bg="gray.50"
                        borderColor="gray.200"
                        _focus={{ borderColor: "#666139", bg: "white" }}
                        maxW="100%"
                      />
                    </Box>
                  )}

                  {/* ساعات العمل — ساعات كاملة فقط */}
                  <Box
                    bg="gray.50"
                    borderRadius="xl"
                    p={4}
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Flex align="center" gap={2} mb={3}>
                      <Clock size={16} color="#666139" />
                      <Text fontSize="sm" fontWeight="bold" color="#666139">
                        ساعات العمل
                      </Text>
                    </Flex>
                    <Text fontSize="xs" color="gray.500" mb={3}>
                      ساعات كاملة فقط — من {formatHourAr(hourToValue(WORK_HOUR_MIN))}{" "}
                      إلى 12 ص (منتصف الليل) — مرتبة من الأقدم للأحدث
                    </Text>
                    <Flex gap={3} flexDir={{ base: "column", sm: "row" }}>
                      <HourPickerGrid
                        label="من الساعة"
                        hint={`${START_HOURS.length} خيار — بداية استقبال المرضى`}
                        value={form.startTime}
                        hours={START_HOURS}
                        onChange={handleStartHourChange}
                      />
                      <HourPickerGrid
                        label="حتى الساعة"
                        hint={`${END_HOURS.length} خيار — الساعات الرمادية قبل البداية غير متاحة`}
                        value={form.endTime}
                        hours={END_HOURS}
                        onChange={(endTime) =>
                          setForm((f) => ({ ...f, endTime }))
                        }
                        isHourDisabled={(h) => h <= startHour}
                      />
                    </Flex>
                  </Box>

                  {/* ملخص سريع */}
                  <Box
                    bg={timeRangeValid ? "green.50" : "red.50"}
                    borderRadius="xl"
                    p={4}
                    border="1px solid"
                    borderColor={timeRangeValid ? "green.100" : "red.200"}
                  >
                    {timeRangeValid ? (
                      <>
                        <Text
                          fontSize="md"
                          fontWeight="bold"
                          color="#666139"
                          textAlign="center"
                          mb={1}
                        >
                          من {formatHourAr(form.startTime)} إلى{" "}
                          {formatHourAr(form.endTime)}
                        </Text>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          textAlign="center"
                          mb={3}
                        >
                          مدة العمل: {previewSlots.length} ساعة —{" "}
                          {previewSlots.length} موعد متاح
                        </Text>
                        <Flex gap={2} flexWrap="wrap" justify="center" dir="ltr">
                          {previewSlots.map((s) => (
                            <Badge
                              key={s}
                              bg="#666139"
                              color="white"
                              variant="subtle"
                              px={2}
                              py={1}
                              borderRadius="md"
                              fontFamily="mono"
                              fontSize="xs"
                            >
                              {formatHourLabel(slotToHour(s))}
                            </Badge>
                          ))}
                        </Flex>
                        <Text fontSize="xs" color="gray.500" mt={3} textAlign="center">
                          كل موعد = ساعة واحدة — حتى 10 حجوزات لكل موعد (
                          {previewSlots.length * 10} حجز كحد أقصى)
                        </Text>
                      </>
                    ) : (
                      <Text
                        fontSize="sm"
                        color="red.600"
                        fontWeight="medium"
                        textAlign="center"
                      >
                        وقت النهاية يجب أن يكون بعد وقت البداية — اختر ساعة
                        إنهاء لاحقة
                      </Text>
                    )}
                  </Box>

                  {/* isActive (edit only) */}
                  {editingDay && (
                    <Flex
                      align="center"
                      justify="space-between"
                      bg="gray.50"
                      borderRadius="xl"
                      p={4}
                    >
                      <Text fontSize="sm" color="gray.700" fontWeight="medium">
                        حالة يوم العمل
                      </Text>
                      <Button
                        size="sm"
                        colorPalette={form.isActive ? "green" : "red"}
                        variant="subtle"
                        onClick={() =>
                          setForm((f) => ({ ...f, isActive: !f.isActive }))
                        }
                        borderRadius="full"
                        px={4}
                      >
                        {form.isActive ? (
                          <>
                            <CheckCircle size={14} style={{ marginLeft: 6 }} />{" "}
                            نشط
                          </>
                        ) : (
                          <>
                            <XCircle size={14} style={{ marginLeft: 6 }} />{" "}
                            معطّل
                          </>
                        )}
                      </Button>
                    </Flex>
                  )}

                  {/* Actions */}
                  <Flex
                    gap={3}
                    mt={2}
                    flexDir={{ base: "column-reverse", sm: "row" }}
                  >
                    <Button
                      flex={1}
                      onClick={handleSave}
                      bg="#666139"
                      color="white"
                      _hover={{ bg: "#1b4332" }}
                      loading={isSaving}
                      disabled={!timeRangeValid}
                      borderRadius="xl"
                      minH={{ base: "44px", md: "auto" }}
                    >
                      حفظ
                    </Button>
                    <Button
                      flex={1}
                      onClick={closeModal}
                      variant="outline"
                      colorPalette="gray"
                      borderRadius="xl"
                      minH={{ base: "44px", md: "auto" }}
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
    </Box>
  );
}
