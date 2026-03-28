"use client";

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Table,
  Badge,
  IconButton,
  SimpleGrid,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  Spinner,
  Card,
  Avatar,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Booking,
  BookingType,
  BookingStatus,
  ExaminationStatus,
  CreateClinicBookingData,
  UpdateBookingData,
} from "@/types/booking";
import BookingModal from "@/components/BookingModal";
import {
  Search,
  Plus,
  Printer,
  Edit2,
  Calendar,
  MoreVertical,
  RefreshCw,
  Users,
  DollarSign,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import api from "@/lib/axios";

const WhatsAppIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function TodayBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | BookingType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | BookingStatus>(
    "all"
  );
  const [filterProcedure, setFilterProcedure] = useState<string>("all");
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [rangeStart, setRangeStart] = useState<string>(todayStr);
  const [rangeEnd, setRangeEnd] = useState<string>(todayStr);
  // For calendar navigation
  const [calViewDate, setCalViewDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const fetchBookings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params: any = {};

      // نوع الحجز
      if (filterType !== "all") params.type = filterType;

      // الحالة — بس لو محددة صريح (الـ API بيحط confirmed تلقائياً لما في تاريخ)
      if (filterStatus !== "all") params.status = filterStatus;

      // قواعد الأولوية حسب الـ doc:
      if (rangeStart === rangeEnd) {
        // يوم واحد → params.date فقط (الـ API بيتجاهل startDate/endDate)
        params.date = rangeStart;
      } else {
        // نطاق → startDate + endDate
        params.startDate = rangeStart;
        params.endDate = rangeEnd;
      }

      const response = await api.get("/bookings/all", { params });

      // الـ API الجديد بيرجع { total, bookings } أو مصفوفة مباشرة (backward compat)
      const data = response.data;
      setBookings(Array.isArray(data) ? data : (data.bookings ?? []));
    } catch (error: any) {
      if (!silent) {
        toaster.create({
          title: "خطأ في جلب البيانات",
          description: error.response?.data?.message || "حدث خطأ أثناء جلب الحجوزات",
          type: "error",
          duration: 3000,
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // جلب أولي وعند تغيير الفلاتر/التاريخ
  useEffect(() => {
    fetchBookings();
  }, [filterType, filterStatus, rangeStart, rangeEnd]);

  // ريل تايم: تحديث تلقائي كل 5 ثوانٍ لظهور تغييرات حالة الكشف دون ريفرش
  useEffect(() => {
    const POLL_INTERVAL_MS = 5000;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchBookings(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [filterType, filterStatus, rangeStart, rangeEnd]);

  // Calendar helpers
  const calYear = calViewDate.getFullYear();
  const calMonth = calViewDate.getMonth();
  const prevCalMonth = () => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextCalMonth = () => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Build calendar grid (Sat-first)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 1) % 7;
    const days: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(calYear, calMonth, d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calYear, calMonth]);

  const handleDayClick = (dateStr: string) => {
    if (!pickingEnd) {
      // First click: anchor the start, enter hover-pick mode
      setRangeStart(dateStr);
      setRangeEnd(dateStr);
      setPickingEnd(true);
    } else {
      // Second click: commit the end
      const [s, e] = dateStr < rangeStart
        ? [dateStr, rangeStart]
        : [rangeStart, dateStr];
      setRangeStart(s);
      setRangeEnd(e);
      setPickingEnd(false);
      setHoverDate(null);
    }
  };

  // While picking, compute the live preview range
  const previewEnd = pickingEnd && hoverDate
    ? (hoverDate < rangeStart ? rangeStart : hoverDate)
    : rangeEnd;
  const previewStart = pickingEnd && hoverDate && hoverDate < rangeStart
    ? hoverDate
    : rangeStart;

  const resetToToday = () => {
    setRangeStart(todayStr);
    setRangeEnd(todayStr);
    setPickingEnd(false);
    setHoverDate(null);
    setCalViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };


  const filteredBookings = useMemo(() => {
    const byProcedure =
      filterProcedure === "all"
        ? bookings
        : bookings.filter((booking) => booking.procedureType === filterProcedure);

    if (!searchQuery) return byProcedure;
    const searchLower = searchQuery.toLowerCase();
    return byProcedure.filter(
      (booking) =>
        booking.customerName.toLowerCase().includes(searchLower) ||
        booking.customerPhone.includes(searchQuery)
    );
  }, [bookings, searchQuery, filterProcedure]);

  const procedureOptions = useMemo(() => {
    return Array.from(
      new Set(
        bookings
          .map((booking) => booking.procedureType?.trim())
          .filter((v): v is string => Boolean(v))
      )
    ).sort((a, b) => a.localeCompare(b, "ar"));
  }, [bookings]);

  const totalIncome = useMemo(() => {
    return filteredBookings.reduce((sum, b) => {
      const amount =
        typeof b.amountPaid === "string"
          ? parseFloat(b.amountPaid)
          : b.amountPaid;
      return sum + (amount || 0);
    }, 0);
  }, [filteredBookings]);

  const handleCreateBooking = async (data: CreateClinicBookingData) => {
    try {
      await api.post("/bookings/clinic", data);
      toaster.create({
        title: "تم إنشاء الحجز بنجاح",
        type: "success",
        duration: 2000,
      });
      fetchBookings();
      setIsModalOpen(false);
    } catch (error: any) {
      toaster.create({
        title: "خطأ في إنشاء الحجز",
        description: error.response?.data?.message || "حدث خطأ",
        type: "error",
        duration: 3000,
      });
    }
  };

  const handleUpdateBooking = async (id: number, data: UpdateBookingData) => {
    try {
      await api.put(`/bookings/${id}`, data);
      toaster.create({
        title: "تم تحديث الحجز بنجاح",
        type: "success",
        duration: 2000,
      });
      fetchBookings();
      setIsModalOpen(false);
    } catch (error: any) {
      toaster.create({
        title: "خطأ في تحديث الحجز",
        description: error.response?.data?.message || "حدث خطأ",
        type: "error",
        duration: 3000,
      });
    }
  };

  const handleStatusChange = async (id: number, newStatus: BookingStatus) => {
    try {
      await api.patch(`/bookings/online/${id}/status`, { status: newStatus });
      toaster.create({
        title: "تم تحديث حالة الحجز",
        type: "success",
        duration: 2000,
      });
      fetchBookings();
    } catch (error: any) {
      toaster.create({
        title: "خطأ في تحديث الحالة",
        description: error.response?.data?.message || "حدث خطأ",
        type: "error",
        duration: 3000,
      });
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (!confirm("هل أنت متأكد من إلغاء هذا الحجز؟")) return;
    try {
      await api.delete(`/bookings/${id}`);
      toaster.create({
        title: "تم إلغاء الحجز",
        type: "success",
        duration: 2000,
      });
      fetchBookings();
    } catch (error: any) {
      toaster.create({
        title: "خطأ في إلغاء الحجز",
        description: error.response?.data?.message || "حدث خطأ",
        type: "error",
        duration: 3000,
      });
    }
  };

  const handleAddClick = () => {
    setEditingBooking(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (booking: Booking) => {
    setEditingBooking(booking);
    setIsModalOpen(true);
  };

  const handleSaveBooking = (data: any) => {
    // BookingModal بيبعت: { name, phone, date, time, amountPaid, visitType }
    // نحط fallback للـ field names القديمة
    const normalized = {
      name: data.name ?? data.customerName,
      phone: data.phone ?? data.customerPhone,
      date: data.date ?? data.appointmentDate,   // YYYY-MM-DD
      time: data.time ?? data.timeSlot,
      amountPaid: typeof data.amountPaid === "string"
        ? parseFloat(data.amountPaid) : data.amountPaid,
      visitType: data.visitType,
    };
    if (editingBooking) {
      handleUpdateBooking(editingBooking.id, normalized);
    } else {
      handleCreateBooking(normalized as any);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge
            bg="#666139" color="white" _hover={{ bg: "#555230" }}
            variant="subtle"
            px={2}
            py={0.5}
            rounded="full"
          >
            مؤكد
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            colorScheme="red"
            variant="subtle"
            px={2}
            py={0.5}
            rounded="full"
          >
            ملغي
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            colorScheme="orange"
            variant="subtle"
            px={2}
            py={0.5}
            rounded="full"
          >
            مرفوض
          </Badge>
        );
      default:
        return (
          <Badge
            colorScheme="yellow"
            variant="subtle"
            px={2}
            py={0.5}
            rounded="full"
          >
            قيد الانتظار
          </Badge>
        );
    }
  };

  const getExaminationStatusBadge = (examinationStatus?: ExaminationStatus) => {
    if (examinationStatus === "done")
      return (
        <Badge
          bg="#666139" color="white" _hover={{ bg: "#555230" }}
          variant="subtle"
          px={2}
          py={0.5}
          rounded="full"
        >
          تم الكشف
        </Badge>
      );
    if (examinationStatus === "waiting")
      return (
        <Badge
          colorScheme="yellow"
          variant="subtle"
          px={2}
          py={0.5}
          rounded="full"
        >
          انتظار
        </Badge>
      );
    return (
      <Text as="span" fontSize="sm" color="gray.400">
        —
      </Text>
    );
  };

  const getRowBg = (examinationStatus?: ExaminationStatus) => {
    if (examinationStatus === "done") return "#f4f3ed";
    if (examinationStatus === "waiting") return "yellow.50";
    return undefined;
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-EG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const handlePrint = () => window.print();

  return (
    <Box minH="100vh" bg="#f0f1f3" dir="rtl">
      {/* Header */}
      <Box
        bg="linear-gradient(135deg, #666139 0%, #7a7350 50%, #8a8260 100%)"
        py={8}
        px={4}
        className="mt-[180px]"
      >
        <Container maxW="7xl">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Box>
              <Heading
                size="xl"
                color="white"
                mb={1}
              >
                حجوزات اليوم
              </Heading>
              <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                <Calendar size={18} />
                <Text>
                  {rangeStart === rangeEnd
                    ? new Date(rangeStart + "T00:00:00").toLocaleDateString("ar-EG", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })
                    : `${new Date(rangeStart + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long" })} — ${new Date(rangeEnd + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}`
                  }
                </Text>
              </Flex>
            </Box>
            <Flex gap={3} className="no-print">
              <Button
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={() => fetchBookings()}
                loading={isLoading}
                // @ts-ignore
                leftIcon={<RefreshCw size={18} />}
              >
                تحديث
              </Button>
              <Button
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={handlePrint}
                // @ts-ignore
                leftIcon={<Printer size={18} />}
              >
                طباعة
              </Button>
              <Button
                bg="white"
                color="#666139"
                _hover={{ bg: "whiteAlpha.900" }}
                onClick={handleAddClick}
                // @ts-ignore
                leftIcon={<Plus size={18} />}
              >
                حجز جديد
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={8} mt={-6} position="relative" zIndex={1}>
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4} mb={8}>
          <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
            <Card.Body
              p={5}
              display="flex"
              flexDirection="row"
              alignItems="center"
              gap={4}
            >
              <Box p={3} bg="#fdfbf7" borderRadius="xl">
                <Users size={24} color="#666139" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  إجمالي الحجوزات
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#666139">
                  {filteredBookings.length}
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
          <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
            <Card.Body
              p={5}
              display="flex"
              flexDirection="row"
              alignItems="center"
              gap={4}
            >
              <Box p={3} bg="#f4f3ed" borderRadius="xl">
                <DollarSign size={24} color="#666139" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  إجمالي الدخل
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#666139">
                  {totalIncome.toFixed(2)} EGP
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
          <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
            <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
              <Box p={3} bg="blue.50" borderRadius="xl">
                <CalendarDays size={24} color="#2b6cb0" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">الفترة المختارة</Text>
                {rangeStart === rangeEnd ? (
                  <>
                    <Text fontSize="md" fontWeight="bold" color="#2b6cb0" lineHeight={1.2}>
                      {new Date(rangeStart + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "long" })}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(rangeStart + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                    </Text>
                  </>
                ) : (
                  <Text fontSize="sm" fontWeight="bold" color="#2b6cb0">
                    {new Date(rangeStart + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    {" — "}
                    {new Date(rangeEnd + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                )}
              </Box>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* ── Monthly Calendar Picker ── */}
        <Card.Root
          bg="white" shadow="sm" borderRadius="2xl" mb={4}
          className="no-print" overflow="hidden"
          onMouseLeave={() => { if (pickingEnd) setHoverDate(null); }}
        >
          {/* Header */}
          <Box bg="linear-gradient(135deg, #6f6a40 0%, #85805a 100%)" px={3} py={2}>
            <Flex align="center" justify="space-between">
              <IconButton
                aria-label="الشهر السابق" size="xs" variant="ghost"
                color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={prevCalMonth}
              ><ChevronRight size={14} /></IconButton>

              <Flex align="center" gap={2}>
                <Text fontWeight="bold" color="white" fontSize="sm">
                  {calViewDate.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
                </Text>
                <Button
                  size="xs" variant="outline" color="white"
                  borderColor="whiteAlpha.500" _hover={{ bg: "whiteAlpha.200" }}
                  onClick={resetToToday} borderRadius="full" px={2} py={1} minH="auto" fontSize="xs"
                >اليوم</Button>
              </Flex>

              <IconButton
                aria-label="الشهر التالي" size="xs" variant="ghost"
                color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={nextCalMonth}
              ><ChevronLeft size={14} /></IconButton>
            </Flex>
          </Box>

          {/* Weekday labels */}
          <Box display="grid" gridTemplateColumns="repeat(7,1fr)" bg="#eae8dc" borderBottom="1px solid" borderColor="#b8b399">
            {["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map(d => (
              <Box key={d} textAlign="center" py={1.5}>
                <Text fontSize="xs" fontWeight="bold" color="#6f6a40">{d}</Text>
              </Box>
            ))}
          </Box>

          {/* Days grid */}
          <Box
            display="grid" gridTemplateColumns="repeat(7,1fr)" p={2} gap={0.5}
            cursor={pickingEnd ? "crosshair" : "default"}
          >
            {calendarDays.map((date, idx) => {
              if (!date) return <Box key={`empty-${idx}`} />;
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isStart = dateStr === previewStart;
              const isEnd = dateStr === previewEnd;
              const isSingleDay = previewStart === previewEnd;
              const inRange = !isSingleDay && dateStr > previewStart && dateStr < previewEnd;
              const isEdge = isStart || isEnd;

              return (
                <Box
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => { if (pickingEnd) setHoverDate(dateStr); }}
                  cursor="pointer"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  h="36px"
                  borderRadius="md"
                  position="relative"
                  transition="all 0.05s"
                  userSelect="none"
                  bg={
                    isEdge
                      ? "#6f6a40"
                      : inRange
                        ? "#f0ebe0"
                        : "transparent"
                  }
                  _hover={{
                    bg: isEdge ? "#5c5733" : pickingEnd ? "#e8e0cc" : "#f0ebe0",
                    transform: "scale(1.08)",
                  }}
                >
                  {isToday && !isEdge && (
                    <Box
                      position="absolute" inset="1px" borderRadius="md"
                      border="1.5px solid" borderColor="#9d9870"
                      pointerEvents="none"
                    />
                  )}
                  <Text fontSize="xs" color={isEdge ? "whiteAlpha.900" : isToday ? "#6f6a40" : "gray.500"} lineHeight={1} mb="0">
                    {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"][date.getDay()]}
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight={isEdge || isToday ? "bold" : "normal"}
                    color={
                      isEdge ? "white"
                        : isToday ? "#6f6a40"
                          : inRange ? "#4a3f28"
                            : "gray.700"
                    }
                    lineHeight={1}
                  >
                    {date.getDate()}
                  </Text>
                  {isStart && !isSingleDay && (
                    <Text fontSize="8px" color="whiteAlpha.800" mt="2px" lineHeight={1}>بداية</Text>
                  )}
                  {isEnd && !isSingleDay && (
                    <Text fontSize="8px" color="whiteAlpha.800" mt="2px" lineHeight={1}>
                      {pickingEnd ? "•" : "نهاية"}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Footer */}
          <Box px={5} py={2.5} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
            <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
              <Text fontSize="xs" color={pickingEnd ? "#6f6a40" : "gray.400"} fontWeight={pickingEnd ? "bold" : "normal"}>
                {pickingEnd
                  ? "✉️ انقل الماوس واضغط على يوم لتحديد نهاية المدة"
                  : "اضغط واحدة ليوم واحد • اضغط مرتين لتحديد مدة"
                }
              </Text>
              <Flex gap={2} align="center">
                {rangeStart !== rangeEnd && (
                  <Text fontSize="xs" fontWeight="bold" color="#6f6a40">
                    {new Date(rangeStart + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    {" — "}
                    {new Date(rangeEnd + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                )}
                {(rangeStart !== rangeEnd || pickingEnd) && (
                  <Button size="xs" variant="ghost" colorPalette="gray" onClick={resetToToday}>
                    إلغاء
                  </Button>
                )}
              </Flex>
            </Flex>
          </Box>
        </Card.Root>

        {/* Filters & Search */}
        <Card.Root
          bg="white"
          shadow="sm"
          borderRadius="xl"
          mb={6}
          className="no-print"
        >
          <Card.Body p={5}>
            <Flex
              direction={{ base: "column", lg: "row" }}
              gap={4}
              align={{ base: "stretch", lg: "center" }}
              justify="space-between"
            >
              <Flex
                gap={3}
                direction={{ base: "column", sm: "row" }}
                flex={1}
                maxW={{ lg: "500px" }}
              >
                <Box position="relative" flex={1}>
                  <Input
                    placeholder="بحث بالاسم أو الهاتف..."
                    bg="gray.50"
                    pr={10}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="md"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#666139", bg: "white" }}
                  />
                  <Box
                    position="absolute"
                    right={3}
                    top="50%"
                    transform="translateY(-50%)"
                    color="gray.400"
                  >
                    <Search size={18} />
                  </Box>
                </Box>
              </Flex>
              <Flex gap={2} wrap="wrap">
                <Box
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  minW={{ base: "full", sm: "220px" }}
                  px={1}
                >
                  <select
                    value={filterProcedure}
                    onChange={(e) => setFilterProcedure(e.target.value)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      padding: "8px 10px",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    <option value="all">كل الإجراءات</option>
                    {procedureOptions.map((procedure) => (
                      <option key={procedure} value={procedure}>
                        {procedure}
                      </option>
                    ))}
                  </select>
                </Box>
                <Flex bg="gray.50" p={1} rounded="xl" gap={1}>
                  {(["all", "online", "clinic"] as const).map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={filterType === type ? "solid" : "ghost"}
                      bg={filterType === type ? "#666139" : "transparent"}
                      color={filterType === type ? "white" : "gray.600"}
                      _hover={{
                        bg: filterType === type ? "#4b482a" : "gray.100",
                      }}
                      onClick={() => setFilterType(type)}
                      rounded="lg"
                    >
                      {type === "all"
                        ? "الكل"
                        : type === "online"
                          ? "أونلاين"
                          : "في العيادة"}
                    </Button>
                  ))}
                </Flex>
                <Flex bg="gray.50" p={1} rounded="xl" gap={1}>
                  {(["all", "pending", "confirmed", "cancelled"] as const).map(
                    (status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={filterStatus === status ? "solid" : "ghost"}
                        bg={
                          filterStatus === status ? "#666139" : "transparent"
                        }
                        color={filterStatus === status ? "white" : "gray.600"}
                        _hover={{
                          bg: filterStatus === status ? "#555230" : "gray.100",
                        }}
                        onClick={() => setFilterStatus(status)}
                        rounded="lg"
                      >
                        {status === "all"
                          ? "كل الحالات"
                          : status === "pending"
                            ? "انتظار"
                            : status === "confirmed"
                              ? "مؤكد"
                              : "ملغي"}
                      </Button>
                    )
                  )}
                </Flex>
              </Flex>
            </Flex>
          </Card.Body>
        </Card.Root>

        {/* Content */}
        {isLoading ? (
          <Flex
            justify="center"
            align="center"
            minH="400px"
            bg="white"
            borderRadius="xl"
            shadow="sm"
          >
            <Spinner size="xl" color="#666139" />
          </Flex>
        ) : (
          <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
            {/* Mobile Cards */}
            <Box display={{ base: "block", md: "none" }} p={4}>
              {filteredBookings.length === 0 ? (
                <Box py={16} textAlign="center">
                  <Users
                    size={48}
                    color="#e2e8f0"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <Text color="gray.500" fontSize="md">
                    لا توجد حجوزات مطابقة
                  </Text>
                  <Text color="gray.400" fontSize="sm" mt={1}>
                    غيّر التاريخ أو الفلاتر
                  </Text>
                </Box>
              ) : (
                <SimpleGrid columns={1} gap={4}>
                  {filteredBookings.map((booking, index) => (
                    <Box
                      key={booking.id}
                      as="button"
                      w="full"
                      textAlign="right"
                      p={4}
                      borderRadius="xl"
                      border="1px solid"
                      borderColor={
                        booking.examinationStatus === "done"
                          ? "green.200"
                          : booking.examinationStatus === "waiting"
                            ? "yellow.200"
                            : "gray.200"
                      }
                      bg={
                        booking.examinationStatus === "done"
                          ? "#f4f3ed"
                          : booking.examinationStatus === "waiting"
                            ? "yellow.50"
                            : "white"
                      }
                      shadow="sm"
                      _hover={{ shadow: "md", borderColor: "#666139" }}
                      transition="all 0.2s"
                      onClick={() =>
                        router.push(`/patient-history/${booking.id}`)
                      }
                    >
                      <Flex justify="space-between" align="start" gap={3} w="full">
                        {/* Info Section (Right side in RTL) */}
                        <Flex align="start" gap={3} flex={1} minW={0}>
                          <Text
                            fontWeight="bold"
                            fontSize="md"
                            color="#666139"
                            minW="24px"
                            flexShrink={0}
                            pt={1}
                          >
                            #{index + 1}
                          </Text>
                          <Avatar.Root size="md" flexShrink={0} bg="#666139">
                            <Avatar.Fallback
                              color="white"
                              fontWeight="bold"
                              fontSize="md"
                            >
                              {booking.customerName?.charAt(0) || "?"}
                            </Avatar.Fallback>
                          </Avatar.Root>
                          <Box minW={0} textAlign="right" pt={1}>
                            <Text
                              fontWeight="bold"
                              fontSize="md"
                              color="#2d3748"
                              // @ts-ignore
                              noOfLines={1}
                              lineHeight="short"
                            >
                              {booking.customerName}
                            </Text>
                            <Flex align="center" gap={2} mt={1.5}>
                              <Text fontSize="sm" color="gray.500" dir="ltr">
                                {booking.customerPhone}
                              </Text>
                              <a
                                href={`https://wa.me/${booking.customerPhone.startsWith('0') ? '2' + booking.customerPhone : booking.customerPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Box color="#25D366" _hover={{ color: "#128C7E", transform: "scale(1.1)" }} transition="all 0.2s">
                                  <WhatsAppIcon width="16px" height="16px" />
                                </Box>
                              </a>
                            </Flex>
                            <Flex align="center" gap={2} mt={3} flexWrap="wrap">
                              <Box bg="white" border="1px solid" borderColor="gray.200" px={2} py={0.5} borderRadius="md" shadow="sm">
                                <Text
                                  fontSize="xs"
                                  fontWeight="bold"
                                  color="#666139"
                                >
                                  {formatTime(booking.appointmentDate ?? "")}
                                </Text>
                              </Box>
                              {booking.procedureType ? (
                                <Badge variant="solid" bg="#666139" color="white" fontSize="xs" px={2} py={0.5} rounded="md">
                                  {booking.procedureType}
                                </Badge>
                              ) : (
                                <Text fontSize="xs" color="gray.400">-</Text>
                              )}
                            </Flex>
                          </Box>
                        </Flex>

                        {/* Badges Section (Left side in RTL) */}
                        <Flex
                          direction="column"
                          align="end"
                          gap={1.5}
                          flexShrink={0}
                        >
                          {getExaminationStatusBadge(booking.examinationStatus)}
                          {getStatusBadge(booking.status)}
                          <Badge
                            colorScheme={
                              booking.bookingType === "online"
                                ? "green"
                                : "blue"
                            }
                            variant="outline"
                            fontSize="2xs"
                          >
                            {booking.bookingType === "online"
                              ? "أونلاين"
                              : "عيادة"}
                          </Badge>
                        </Flex>
                      </Flex>
                      <Flex
                        justify="space-between"
                        align="center"
                        mt={4}
                        pt={3}
                        borderTop="1px solid"
                        borderColor="gray.100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Text fontWeight="bold" color="#666139">
                          {formatAmount(booking.amountPaid)} EGP
                        </Text>
                        <Flex gap={2}>
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(booking);
                            }}
                          >
                            تعديل
                          </Button>
                          <MenuRoot>
                            <MenuTrigger asChild>
                              <IconButton
                                aria-label="المزيد"
                                size="xs"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical size={16} />
                              </IconButton>
                            </MenuTrigger>
                            <MenuContent>
                              {booking.bookingType === "online" && (
                                <>
                                  <MenuItem
                                    value="pending"
                                    onClick={() =>
                                      handleStatusChange(booking.id, "pending")
                                    }
                                  >
                                    قيد الانتظار
                                  </MenuItem>
                                  <MenuItem
                                    value="confirmed"
                                    onClick={() =>
                                      handleStatusChange(
                                        booking.id,
                                        "confirmed"
                                      )
                                    }
                                  >
                                    تأكيد
                                  </MenuItem>
                                  <MenuItem
                                    value="rejected"
                                    onClick={() =>
                                      handleStatusChange(booking.id, "rejected")
                                    }
                                  >
                                    رفض
                                  </MenuItem>
                                </>
                              )}
                              <MenuItem
                                value="cancelled"
                                onClick={() => handleDeleteClick(booking.id)}
                                color="red.500"
                              >
                                إلغاء الحجز
                              </MenuItem>
                            </MenuContent>
                          </MenuRoot>
                        </Flex>
                      </Flex>
                    </Box>
                  ))}
                </SimpleGrid>
              )}
            </Box>

            {/* Desktop Table */}
            <Box display={{ base: "none", md: "block" }}>
              <Table.Root>
                <Table.Header
                  bg="#fdfbf7"
                  borderBottom="2px solid"
                  borderColor="gray.100"
                >
                  <Table.Row>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                      w="56px"
                    >
                      رقم
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      العميل
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      الهاتف
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      النوع
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="sm"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      الإجراء
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      الوقت
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      المبلغ
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      حالة الكشف
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      الحالة
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                      className="no-print"
                    >
                      إجراءات
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredBookings.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={11} textAlign="center" py={16}>
                        <Users
                          size={48}
                          color="#e2e8f0"
                          style={{ margin: "0 auto 12px", display: "block" }}
                        />
                        <Text color="gray.500" fontSize="md">
                          لا توجد حجوزات مطابقة
                        </Text>
                        <Text color="gray.400" fontSize="sm" mt={1}>
                          غيّر التاريخ أو الفلاتر
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    filteredBookings.map((booking, index) => (
                      <Table.Row
                        key={booking.id}
                        bg={getRowBg(booking.examinationStatus)}
                        _hover={{
                          bg:
                            booking.examinationStatus === "done"
                              ? "#e0decc"
                              : booking.examinationStatus === "waiting"
                                ? "yellow.100"
                                : "gray.50",
                        }}
                        cursor="pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (
                            !target.closest("button") &&
                            !target.closest("[data-actions]")
                          ) {
                            router.push(`/patient-history/${booking.id}`);
                          }
                        }}
                        transition="background 0.15s"
                      >
                        <Table.Cell py={4} px={4} fontWeight="bold" color="#666139">
                          {index + 1}
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          <Flex align="center" gap={3}>
                            <Avatar.Root size="sm" bg="#666139" flexShrink={0}>
                              <Avatar.Fallback
                                color="white"
                                fontWeight="bold"
                                fontSize="xs"
                              >
                                {booking.customerName?.charAt(0) || "?"}
                              </Avatar.Fallback>
                            </Avatar.Root>
                            <Text fontWeight="medium" color="#2d3748">
                              {booking.customerName}
                            </Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell
                          py={4}
                          px={4}
                          fontSize="sm"
                          color="gray.600"
                        >
                          <Flex align="center" gap={2}>
                            <Text>{booking.customerPhone}</Text>
                            <a
                              href={`https://wa.me/${booking.customerPhone.startsWith('0') ? '2' + booking.customerPhone : booking.customerPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Box color="#25D366" _hover={{ color: "#128C7E", transform: "scale(1.1)" }} transition="all 0.2s" cursor="pointer">
                                <WhatsAppIcon width="18px" height="18px" />
                              </Box>
                            </a>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          <Badge
                            colorScheme={
                              booking.bookingType === "online"
                                ? "green"
                                : "blue"
                            }
                            variant="subtle"
                            px={2}
                            py={0.5}
                            rounded="full"
                          >
                            {booking.bookingType === "online"
                              ? "أونلاين"
                              : "في العيادة"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          {booking.procedureType ? (
                            <Badge variant="solid" bg="#666139" color="white" px={3} py={1} rounded="full" fontWeight="bold">
                              {booking.procedureType}
                            </Badge>
                          ) : (
                            <Text color="gray.400" fontSize="sm">-</Text>
                          )}
                        </Table.Cell>
                        <Table.Cell
                          py={4}
                          px={4}
                          fontWeight="medium"
                          color="gray.700"
                        >
                          {formatTime(booking.appointmentDate ?? "")}
                        </Table.Cell>
                        <Table.Cell
                          py={4}
                          px={4}
                          fontWeight="bold"
                          color="#666139"
                        >
                          {formatAmount(booking.amountPaid)} EGP
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          {getExaminationStatusBadge(booking.examinationStatus)}
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          {getStatusBadge(booking.status)}
                        </Table.Cell>
                        <Table.Cell
                          py={4}
                          px={4}
                          className="no-print"
                          data-actions
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Flex gap={2}>
                            <IconButton
                              aria-label="تعديل"
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => handleEditClick(booking)}
                            >
                              <Edit2 size={16} />
                            </IconButton>
                            <MenuRoot>
                              <MenuTrigger asChild>
                                <IconButton
                                  aria-label="المزيد"
                                  size="sm"
                                  variant="ghost"
                                >
                                  <MoreVertical size={16} />
                                </IconButton>
                              </MenuTrigger>
                              <MenuContent>
                                <MenuItem
                                  value="edit"
                                  onClick={() => handleEditClick(booking)}
                                >
                                  تعديل البيانات
                                </MenuItem>
                                {booking.bookingType === "online" && (
                                  <>
                                    <MenuItem
                                      value="pending"
                                      onClick={() =>
                                        handleStatusChange(
                                          booking.id,
                                          "pending"
                                        )
                                      }
                                    >
                                      قيد الانتظار
                                    </MenuItem>
                                    <MenuItem
                                      value="confirmed"
                                      onClick={() =>
                                        handleStatusChange(
                                          booking.id,
                                          "confirmed"
                                        )
                                      }
                                    >
                                      تأكيد
                                    </MenuItem>
                                    <MenuItem
                                      value="rejected"
                                      onClick={() =>
                                        handleStatusChange(
                                          booking.id,
                                          "rejected"
                                        )
                                      }
                                    >
                                      رفض
                                    </MenuItem>
                                  </>
                                )}
                                <MenuItem
                                  value="delete"
                                  onClick={() => handleDeleteClick(booking.id)}
                                  color="red.500"
                                >
                                  إلغاء الحجز
                                </MenuItem>
                              </MenuContent>
                            </MenuRoot>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card.Root>
        )}

        {/* Print Summary */}
        <Box
          display="none"
          css={{ "@media print": { display: "block", marginTop: "2rem" } }}
        >
          <Flex justify="space-between" borderTop="1px dashed gray" pt={4}>
            <Text>إجمالي الحجوزات: {filteredBookings.length}</Text>
            <Text fontWeight="bold">
              إجمالي الدخل: {totalIncome.toFixed(2)} EGP
            </Text>
          </Flex>
        </Box>
      </Container>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBooking}
        initialData={editingBooking}
      />

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          @page {
            direction: rtl;
          }
        }
      `}</style>
    </Box>
  );
}
