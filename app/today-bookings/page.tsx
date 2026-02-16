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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (filterType !== "all") params.type = filterType;
      if (filterStatus !== "all") params.status = filterStatus;
      if (selectedDate) params.date = selectedDate;
      const response = await api.get("/bookings/all", { params });
      setBookings(response.data);
    } catch (error: any) {
      toaster.create({
        title: "خطأ في جلب البيانات",
        description:
          error.response?.data?.message || "حدث خطأ أثناء جلب الحجوزات",
        type: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterType, filterStatus, selectedDate]);

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
    if (editingBooking) {
      handleUpdateBooking(editingBooking.id, {
        name: data.customerName,
        phone: data.customerPhone,
        date: data.appointmentDate,
        amountPaid:
          typeof data.amountPaid === "string"
            ? parseFloat(data.amountPaid)
            : data.amountPaid,
        visitType: data.visitType,
      });
    } else {
      handleCreateBooking({
        name: data.customerName,
        phone: data.customerPhone,
        date: data.appointmentDate,
        amountPaid:
          typeof data.amountPaid === "string"
            ? parseFloat(data.amountPaid)
            : data.amountPaid,
        visitType: data.visitType,
      });
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge
            colorScheme="green"
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
          colorScheme="green"
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
    if (examinationStatus === "done") return "green.50";
    if (examinationStatus === "waiting") return "yellow.50";
    return undefined;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const handlePrint = () => window.print();

  return (
    <Box minH="100vh" bg="#f0f1f3" dir="rtl" fontFamily="var(--font-tajawal)">
      {/* Header */}
      <Box
        bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)"
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
                fontFamily="var(--font-tajawal)"
              >
                حجوزات اليوم
              </Heading>
              <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                <Calendar size={18} />
                <Text>
                  {new Date(selectedDate).toLocaleDateString("ar-EG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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
                color="#615b36"
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
                <Users size={24} color="#615b36" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  إجمالي الحجوزات
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#615b36">
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
              <Box p={3} bg="green.50" borderRadius="xl">
                <DollarSign size={24} color="#2d6a4f" />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  إجمالي الدخل
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="#2d6a4f">
                  {totalIncome.toFixed(2)} EGP
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
              <Box p={3} bg="blue.50" borderRadius="xl">
                <CalendarDays size={24} color="#2b6cb0" />
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  التاريخ
                </Text>
                <Input
                  type="date"
                  size="sm"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  border="none"
                  p={0}
                  fontWeight="bold"
                  color="#2b6cb0"
                  maxW="140px"
                  className="no-print"
                />
              </Box>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

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
                    _focus={{ borderColor: "#615b36", bg: "white" }}
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
                      bg={filterType === type ? "#615b36" : "transparent"}
                      color={filterType === type ? "white" : "gray.600"}
                      _hover={{
                        bg: filterType === type ? "#4a452a" : "gray.100",
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
                          filterStatus === status ? "gray.700" : "transparent"
                        }
                        color={filterStatus === status ? "white" : "gray.600"}
                        _hover={{
                          bg: filterStatus === status ? "gray.800" : "gray.100",
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
            <Spinner size="xl" color="#615b36" />
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
                  {filteredBookings.map((booking) => (
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
                          ? "green.50"
                          : booking.examinationStatus === "waiting"
                          ? "yellow.50"
                          : "white"
                      }
                      shadow="sm"
                      _hover={{ shadow: "md", borderColor: "#615b36" }}
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
                          <Avatar.Root size="sm" flexShrink={0} bg="#615b36">
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
                              // @ts-ignore
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
                                color="#615b36"
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
                        <Text fontWeight="bold" color="#615b36">
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
                      <Table.Cell colSpan={8} textAlign="center" py={16}>
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
                    filteredBookings.map((booking) => (
                      <Table.Row
                        key={booking.id}
                        bg={getRowBg(booking.examinationStatus)}
                        _hover={{
                          bg:
                            booking.examinationStatus === "done"
                              ? "green.100"
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
                        <Table.Cell py={4} px={4}>
                          <Flex align="center" gap={3}>
                            <Avatar.Root size="sm" bg="#615b36" flexShrink={0}>
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
                          color="#615b36"
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
