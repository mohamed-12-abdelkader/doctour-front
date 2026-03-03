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

export default function TodayBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | BookingType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | BookingStatus>(
    "all"
  );
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
    if (!searchQuery) return bookings;
    const searchLower = searchQuery.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.customerName.toLowerCase().includes(searchLower) ||
        booking.customerPhone.includes(searchQuery)
    );
  }, [bookings, searchQuery]);

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
    // BookingModal بيبعت: { name, phone, date, amountPaid, visitType }
    // نحط fallback للـ field names القديمة
    const normalized = {
      name: data.name ?? data.customerName,
      phone: data.phone ?? data.customerPhone,
      date: data.date ?? data.appointmentDate,   // YYYY-MM-DD
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

  const formatTime = (dateString: string) => {
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
                onClick={fetchBookings}
                loading={isLoading}
                leftIcon={<RefreshCw size={18} />}
              >
                تحديث
              </Button>
              <Button
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={handlePrint}
                leftIcon={<Printer size={18} />}
              >
                طباعة
              </Button>
              <Button
                bg="white"
                color="#666139"
                _hover={{ bg: "whiteAlpha.900" }}
                onClick={handleAddClick}
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
                      <Flex justify="space-between" align="start" gap={3}>
                        <Flex
                          direction="column"
                          align="end"
                          gap={1}
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
                            variant="subtle"
                            fontSize="xs"
                          >
                            {booking.bookingType === "online"
                              ? "أونلاين"
                              : "عيادة"}
                          </Badge>
                        </Flex>
                        <Flex align="center" gap={3} flex={1} minW={0}>
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="#666139"
                            minW="28px"
                            flexShrink={0}
                          >
                            {index + 1}
                          </Text>
                          <Avatar.Root size="sm" flexShrink={0} bg="#666139">
                            <Avatar.Fallback
                              color="white"
                              fontWeight="bold"
                              fontSize="sm"
                            >
                              {booking.customerName?.charAt(0) || "?"}
                            </Avatar.Fallback>
                          </Avatar.Root>
                          <Box minW={0}>
                            <Text
                              fontWeight="bold"
                              fontSize="lg"
                              color="#2d3748"
                              noOfLines={1}
                            >
                              {booking.customerName}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {booking.customerPhone}
                            </Text>
                            <Flex align="center" gap={2} mt={1}>
                              <Text
                                fontSize="sm"
                                fontWeight="bold"
                                color="#666139"
                              >
                                {formatTime(booking.appointmentDate)}
                              </Text>
                              <Badge
                                colorScheme={
                                  booking.visitType === "checkup"
                                    ? "purple"
                                    : "orange"
                                }
                                variant="subtle"
                                fontSize="xs"
                              >
                                {booking.visitType === "checkup"
                                  ? "كشف"
                                  : booking.visitType === "followup"
                                    ? "إعادة"
                                    : "-"}
                              </Badge>
                            </Flex>
                          </Box>
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
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                    >
                      نوع الزيارة
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
                      <Table.Cell colSpan={9} textAlign="center" py={16}>
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
                          {booking.customerPhone}
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
                          <Badge
                            colorScheme={
                              booking.visitType === "checkup"
                                ? "purple"
                                : "orange"
                            }
                            variant="subtle"
                            px={2}
                            py={0.5}
                            rounded="full"
                          >
                            {booking.visitType === "checkup"
                              ? "كشف"
                              : booking.visitType === "followup"
                                ? "إعادة"
                                : "-"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell
                          py={4}
                          px={4}
                          fontWeight="medium"
                          color="gray.700"
                        >
                          {formatTime(booking.appointmentDate)}
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
