"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  IconButton,
  Input,
  SimpleGrid,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { WhatsAppCustomerLink } from "@/components/WhatsAppCustomerLink";
import {
  canChooseDoctor,
  getCurrentDoctorId,
  getCurrentRole,
  setSelectedDoctorId,
} from "@/lib/doctor-context";
import api from "@/lib/axios";
import type { BookingStatus, BookingType } from "@/types/booking";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const SEARCH_FETCH_LIMIT = 10000;
type BookingSortOrder = "default" | "desc" | "asc";

type DoctorOption = {
  id: number;
  name?: string;
  user?: { name?: string };
};

type LastBookingSummary = {
  id?: number | string;
  status?: BookingStatus | string;
  bookingType?: BookingType | string;
  appointmentDate?: string | null;
  preferredDate?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
};

type CustomerCase = {
  name: string;
  phone: string;
  normalizedPhone?: string;
  totalBookings: number;
  statusCounts?: Partial<Record<BookingStatus, number>> & Record<string, number | undefined>;
  bookingTypeCounts?: Partial<Record<BookingType, number>> & Record<string, number | undefined>;
  firstRegisteredAt?: string | null;
  lastRegisteredAt?: string | null;
  lastBookingDate?: string | null;
  lastBooking?: LastBookingSummary | null;
};

type CasesResponse = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  cases?: CustomerCase[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "مؤكد";
    case "pending":
      return "قيد الانتظار";
    case "cancelled":
      return "ملغي";
    case "rejected":
      return "مرفوض";
    default:
      return status || "غير محدد";
  }
}

function statusPalette(status: string) {
  switch (status) {
    case "confirmed":
      return "green";
    case "pending":
      return "orange";
    case "cancelled":
    case "rejected":
      return "red";
    default:
      return "gray";
  }
}

function bookingTypeLabel(type: string) {
  if (type === "clinic") return "عيادة";
  if (type === "online") return "أونلاين";
  return type || "غير محدد";
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function normalizePhoneSearch(value: unknown): string {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");
}

function customerMatchesSearch(customer: CustomerCase, query: string): boolean {
  const textQuery = normalizeSearchText(query);
  const phoneQuery = normalizePhoneSearch(query);
  if (!textQuery && !phoneQuery) return true;

  const textHaystack = normalizeSearchText(
    `${customer.name ?? ""} ${customer.phone ?? ""} ${customer.normalizedPhone ?? ""}`,
  );
  if (textQuery && textHaystack.includes(textQuery)) return true;

  const phoneHaystack = normalizePhoneSearch(
    `${customer.phone ?? ""} ${customer.normalizedPhone ?? ""}`,
  );
  return phoneQuery.length > 0 && phoneHaystack.includes(phoneQuery);
}

function countOf(
  counts: CustomerCase["statusCounts"] | CustomerCase["bookingTypeCounts"],
  key: string,
) {
  const value = Number(counts?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: Array<number | string> = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("start-ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("end-ellipsis");
    pages.push(totalPages);
  }

  return pages;
}

export default function AllCustomersPage() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [cases, setCases] = useState<CustomerCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setDoctorId] = useState(0);
  const [canSelectDoctor, setCanSelectDoctor] = useState(false);
  const [doctorFilterReady, setDoctorFilterReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [bookingSortOrder, setBookingSortOrder] = useState<BookingSortOrder>("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const role = getCurrentRole();
    const canSelect = canChooseDoctor(role);
    setCanSelectDoctor(canSelect);
    const current = getCurrentDoctorId();
    if (current) setDoctorId(current);
    if (!canSelect || current) setDoctorFilterReady(true);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!canSelectDoctor) return;

    const loadDoctors = async () => {
      try {
        const res = await api.get("/doctors");
        const list = Array.isArray(res.data) ? res.data : (res.data?.doctors ?? []);
        const nextDoctors = Array.isArray(list) ? (list as DoctorOption[]) : [];
        setDoctors(nextDoctors);
        if (nextDoctors.length === 0) {
          setDoctorFilterReady(true);
          return;
        }

        setDoctorId((previous) => {
          const ids = new Set(nextDoctors.map((doctor) => Number(doctor.id)));
          if (previous > 0 && ids.has(previous)) return previous;
          const firstDoctorId = Number(nextDoctors[0]?.id ?? 0);
          return Number.isFinite(firstDoctorId) ? firstDoctorId : previous;
        });
        setDoctorFilterReady(true);
      } catch {
        setDoctors([]);
        setDoctorFilterReady(true);
      }
    };

    loadDoctors();
  }, [canSelectDoctor]);

  useEffect(() => {
    if (!canSelectDoctor) return;
    setSelectedDoctorId(selectedDoctorId || null);
  }, [canSelectDoctor, selectedDoctorId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchCases = useCallback(async () => {
    if (!doctorFilterReady) return;

    setIsLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const searchTerm = debouncedSearchQuery.trim();
      const params: Record<string, string | number> = {
        page: searchTerm ? 1 : currentPage,
        limit: searchTerm ? SEARCH_FETCH_LIMIT : pageSize,
      };
      if (selectedDoctorId > 0) params.doctorId = selectedDoctorId;
      if (bookingSortOrder !== "default") {
        params.sortBy = "totalBookings";
        params.sortOrder = bookingSortOrder;
      }

      const response = await api.get("/bookings/cases", {
        params,
        signal: controller.signal,
      });

      const data = response.data as CasesResponse | CustomerCase[];
      const list = Array.isArray(data) ? data : (data.cases ?? []);
      const nextCases = Array.isArray(list) ? list : [];
      const searchedCases = searchTerm
        ? nextCases.filter((customer) => customerMatchesSearch(customer, searchTerm))
        : nextCases;
      const responseTotal = searchTerm
        ? searchedCases.length
        : Array.isArray(data)
          ? nextCases.length
          : Number(data.total ?? nextCases.length);
      const responseTotalPages = searchTerm
        ? Math.ceil(responseTotal / pageSize)
        : Array.isArray(data)
          ? Math.max(1, Math.ceil(nextCases.length / pageSize))
          : Number(data.totalPages ?? Math.ceil(responseTotal / pageSize));

      setCases(searchedCases);
      setTotal(Number.isFinite(responseTotal) ? responseTotal : searchedCases.length);
      setTotalPages(
        Number.isFinite(responseTotalPages) && responseTotalPages > 0
          ? responseTotalPages
          : 1,
      );
    } catch (error) {
      const err = error as {
        name?: string;
        code?: string;
        response?: { data?: { message?: string } };
      };
      if (
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED" ||
        controller.signal.aborted
      ) {
        return;
      }

      toaster.create({
        title: "خطأ في جلب العملاء",
        description: err.response?.data?.message || "تعذر تحميل قائمة العملاء.",
        type: "error",
        duration: 3000,
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [
    bookingSortOrder,
    currentPage,
    debouncedSearchQuery,
    doctorFilterReady,
    pageSize,
    selectedDoctorId,
  ]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const sortedCases = useMemo(
    () => {
      if (bookingSortOrder === "default") return cases;

      return [...cases].sort((a, b) => {
        const first = Number(a.totalBookings || 0);
        const second = Number(b.totalBookings || 0);
        return bookingSortOrder === "desc" ? second - first : first - second;
      });
    },
    [bookingSortOrder, cases],
  );
  const isClientSearchActive = debouncedSearchQuery.trim().length > 0;
  const visibleCases = useMemo(() => {
    if (!isClientSearchActive) return sortedCases;

    const start = (currentPage - 1) * pageSize;
    return sortedCases.slice(start, start + pageSize);
  }, [currentPage, isClientSearchActive, pageSize, sortedCases]);
  const visibleStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(visibleStart + visibleCases.length - 1, total);

  const renderStatusBadges = (customer: CustomerCase) => {
    const counts = customer.statusCounts ?? {};
    const keys = Object.keys(counts).filter((key) => countOf(counts, key) > 0);
    if (keys.length === 0) {
      return (
        <Badge colorPalette="gray" variant="subtle" rounded="full" px={2}>
          لا توجد حالات
        </Badge>
      );
    }

    return (
      <Flex gap={1.5} wrap="wrap">
        {keys.map((status) => (
          <Badge
            key={status}
            colorPalette={statusPalette(status)}
            variant="subtle"
            rounded="full"
            px={2}
          >
            {statusLabel(status)}: {countOf(counts, status)}
          </Badge>
        ))}
      </Flex>
    );
  };

  const renderTypeBadges = (customer: CustomerCase) => {
    const counts = customer.bookingTypeCounts ?? {};
    const keys = Object.keys(counts).filter((key) => countOf(counts, key) > 0);
    if (keys.length === 0) return <Text color="gray.400">—</Text>;

    return (
      <Flex gap={1.5} wrap="wrap">
        {keys.map((type) => (
          <Badge
            key={type}
            colorPalette={type === "online" ? "green" : "blue"}
            variant="outline"
            rounded="full"
            px={2}
          >
            {bookingTypeLabel(type)}: {countOf(counts, type)}
          </Badge>
        ))}
      </Flex>
    );
  };

  const renderPaginationControls = (position: "top" | "bottom") => (
    <Flex
      align="center"
      justify="space-between"
      gap={3}
      p={position === "bottom" ? 5 : 4}
      bg={position === "bottom" ? "#f9fafb" : "white"}
      borderTop={position === "bottom" ? "1px solid" : undefined}
      borderBottom={position === "top" ? "1px solid" : undefined}
      borderColor="gray.100"
      flexWrap="wrap"
    >
      <Box>
        <Text fontWeight="bold" color="gray.700">
          صفحة {currentPage} من {totalPages}
        </Text>
        <Text fontSize="sm" color="gray.500">
          عرض {visibleStart} - {visibleEnd} من {total} عميل
        </Text>
      </Box>

      <Flex align="center" gap={2} flexWrap="wrap">
        <Flex align="center" gap={2}>
          <Text fontSize="sm" color="gray.500">
            في الصفحة
          </Text>
          <Box
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            px={1}
          >
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as typeof pageSize);
                setCurrentPage(1);
              }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "7px 8px",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </Box>
        </Flex>

        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        >
          <ChevronRight size={16} />
          السابق
        </Button>
        {pageNumbers.map((page) =>
          typeof page === "number" ? (
            <Button
              key={page}
              size="sm"
              minW="34px"
              px={2}
              variant={page === currentPage ? "solid" : "outline"}
              bg={page === currentPage ? "#666139" : undefined}
              color={page === currentPage ? "white" : undefined}
              disabled={isLoading}
              _hover={{ bg: page === currentPage ? "#555230" : "gray.50" }}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ) : (
            <Text key={page} px={1} color="gray.400" fontWeight="bold">
              ...
            </Text>
          ),
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        >
          التالي
          <ChevronLeft size={16} />
        </Button>
      </Flex>
    </Flex>
  );

  const renderMobileCard = (customer: CustomerCase, index: number) => {
    const lastBookingId = customer.lastBooking?.id;

    return (
      <Box
        key={`${customer.normalizedPhone || customer.phone}-${index}`}
        bg="white"
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.100"
        borderInlineStartWidth="4px"
        borderInlineStartColor="#666139"
        shadow="sm"
        p={4}
      >
        <Flex align="flex-start" gap={3}>
          <Flex
            align="center"
            justify="center"
            minW="34px"
            h="34px"
            borderRadius="lg"
            bg="#666139"
            color="white"
            fontWeight="bold"
          >
            {visibleStart + index}
          </Flex>
          <Avatar.Root size="md" bg="#666139" flexShrink={0}>
            <Avatar.Fallback color="white" fontWeight="bold">
              {customer.name?.charAt(0) || "?"}
            </Avatar.Fallback>
          </Avatar.Root>
          <Box flex={1} minW={0}>
            <Text fontWeight="bold" color="#2d3748" lineClamp={2}>
              {customer.name || "عميل بدون اسم"}
            </Text>
            <Text fontSize="sm" color="gray.500" dir="ltr" textAlign="right">
              {customer.phone || "—"}
            </Text>
          </Box>
          <WhatsAppCustomerLink phone={customer.phone} pill showPhoneTooltip />
        </Flex>

        <SimpleGrid columns={2} gap={3} mt={4}>
          <Box bg="#fdfbf7" rounded="lg" p={3}>
            <Text fontSize="xs" color="gray.500">
              إجمالي الحجوزات
            </Text>
            <Text fontWeight="bold" color="#666139">
              {customer.totalBookings || 0}
            </Text>
          </Box>
          <Box bg="gray.50" rounded="lg" p={3}>
            <Text fontSize="xs" color="gray.500">
              آخر حجز
            </Text>
            <Text fontWeight="bold" color="gray.700">
              {formatDate(customer.lastBookingDate)}
            </Text>
          </Box>
        </SimpleGrid>

        <Box mt={4}>
          <Text fontSize="xs" color="gray.500" mb={1.5}>
            حالات الحجوزات
          </Text>
          {renderStatusBadges(customer)}
        </Box>

        <Box mt={3}>
          <Text fontSize="xs" color="gray.500" mb={1.5}>
            نوع الحجز
          </Text>
          {renderTypeBadges(customer)}
        </Box>

        <Flex justify="space-between" align="center" gap={2} mt={4}>
          <Text fontSize="xs" color="gray.500">
            أول تسجيل: {formatDate(customer.firstRegisteredAt)}
          </Text>
          {lastBookingId != null && (
            <Button
              size="xs"
              variant="outline"
              colorPalette="blue"
              onClick={() => router.push(`/patient-history/${lastBookingId}`)}
            >
              سجل العميل
            </Button>
          )}
        </Flex>
      </Box>
    );
  };

  return (
    <Box minH="100vh" bg="#f0f1f3" dir="rtl">
      <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" py={8} px={4}>
        <Container maxW="7xl">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Flex align="center" gap={4}>
              <Button
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={() => router.push("/admin/dashboard")}
                size="sm"
                gap={2}
              >
                <ArrowRight size={20} />
                رجوع
              </Button>
              <Box>
                <Heading size="xl" color="white">
                  كل العملاء
                </Heading>
                <Text color="whiteAlpha.900" fontSize="sm" mt={1}>
                  متابعة العملاء وعدد حجوزاتهم وحالات آخر التعاملات
                </Text>
              </Box>
            </Flex>
            <Button
              bg="white"
              color="#615b36"
              _hover={{ bg: "whiteAlpha.900" }}
              onClick={fetchCases}
              loading={isLoading}
              size="sm"
              gap={2}
            >
              <RefreshCw size={16} />
              تحديث
            </Button>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={8} mt={-6} position="relative" zIndex={1}>
        <Card.Root bg="white" shadow="sm" borderRadius="xl" mb={6}>
          <Card.Body>
            <Flex gap={4} align="flex-end" justify="space-between" flexWrap="wrap">
              <Box flex={1} minW={{ base: "full", md: "320px" }}>
                <Text fontWeight="bold" color="gray.700" mb={2}>
                  بحث باسم العميل
                </Text>
                <Flex
                  align="center"
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="full"
                  px={4}
                  py={2}
                  gap={2}
                >
                  <Search size={18} color="#9ca3af" />
                  <Input
                    variant="subtle"
                    placeholder="اكتب اسم أو رقم العميل..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    bg="transparent"
                    border="none"
                    _focus={{ boxShadow: "none" }}
                  />
                  {searchQuery && (
                    <Button
                      size="xs"
                      bg="#666139"
                      color="white"
                      rounded="full"
                      onClick={() => {
                        setSearchQuery("");
                        setDebouncedSearchQuery("");
                        setCurrentPage(1);
                      }}
                    >
                      مسح
                    </Button>
                  )}
                </Flex>
                {debouncedSearchQuery && (
                  <Text fontSize="sm" color="gray.500" mt={2} px={1}>
                    البحث الحالي: {debouncedSearchQuery}
                  </Text>
                )}
              </Box>

              <Box minW={{ base: "full", sm: "240px" }}>
                <Text fontWeight="bold" color="gray.700" mb={2}>
                  ترتيب عدد الحجوزات
                </Text>
                <Box
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  px={1}
                >
                  <select
                    value={bookingSortOrder}
                    onChange={(event) => {
                      setBookingSortOrder(event.target.value as BookingSortOrder);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      padding: "10px 12px",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    <option value="default">الترتيب الطبيعي</option>
                    <option value="desc">الأكثر حجوزات أولاً</option>
                    <option value="asc">الأقل حجوزات أولاً</option>
                  </select>
                </Box>
              </Box>

              {canSelectDoctor && (
                <Box minW={{ base: "full", sm: "240px" }}>
                  <Text fontWeight="bold" color="gray.700" mb={2}>
                    الطبيب
                  </Text>
                  <Box
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    px={1}
                  >
                    <select
                      value={selectedDoctorId || ""}
                      onChange={(event) => {
                        const id = Number(event.target.value) || 0;
                        setDoctorId(id);
                        setSelectedDoctorId(id || null);
                        setCurrentPage(1);
                      }}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        padding: "10px 12px",
                        color: "#374151",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">كل الأطباء</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.user?.name || doctor.name || `Doctor #${doctor.id}`}
                        </option>
                      ))}
                    </select>
                  </Box>
                </Box>
              )}
            </Flex>
          </Card.Body>
        </Card.Root>

        {isLoading ? (
          <Flex justify="center" align="center" minH="360px" bg="white" borderRadius="xl" shadow="sm">
            <Spinner size="xl" color="#666139" />
          </Flex>
        ) : (
          <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
            {renderPaginationControls("top")}

            <Box display={{ base: "block", lg: "none" }} p={4}>
              {sortedCases.length === 0 ? (
                <Box py={16} textAlign="center">
                  <Users size={48} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
                  <Text color="gray.500">لا يوجد عملاء مطابقون</Text>
                  <Text color="gray.400" fontSize="sm" mt={1}>
                    جرّب تغيير البحث أو الطبيب
                  </Text>
                </Box>
              ) : (
                <SimpleGrid columns={1} gap={3}>
                  {visibleCases.map((customer, index) => renderMobileCard(customer, index))}
                </SimpleGrid>
              )}
            </Box>

            <Box display={{ base: "none", lg: "block" }} overflowX="auto" p={4}>
              <Table.Root size="sm" variant="outline" striped>
                <Table.Header bg="#fdfbf7" borderBottom="2px solid" borderColor="gray.100">
                  <Table.Row>
                    <Table.ColumnHeader py={4} px={4} w="56px" color="gray.600">
                      رقم
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600">
                      العميل
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={3} textAlign="center" color="gray.600">
                      واتساب
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600">
                      إجمالي الحجوزات
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600">
                      الحالات
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600">
                      نوع الحجز
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600">
                      آخر حجز
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600">
                      آخر تسجيل
                    </Table.ColumnHeader>
                    <Table.ColumnHeader py={4} px={4} color="gray.600" textAlign="center">
                      إجراءات
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedCases.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={9} py={16} textAlign="center">
                        <Users size={48} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
                        <Text color="gray.500">لا يوجد عملاء مطابقون</Text>
                        <Text color="gray.400" fontSize="sm" mt={1}>
                          جرّب تغيير البحث أو الطبيب
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    visibleCases.map((customer, index) => {
                      const lastBookingId = customer.lastBooking?.id;

                      return (
                        <Table.Row
                          key={`${customer.normalizedPhone || customer.phone}-${index}`}
                          _hover={{ bg: "gray.50" }}
                        >
                          <Table.Cell py={4} px={4} fontWeight="bold" color="#666139">
                            {visibleStart + index}
                          </Table.Cell>
                          <Table.Cell py={4} px={4}>
                            <Flex align="center" gap={3}>
                              <Avatar.Root size="sm" bg="#666139" flexShrink={0}>
                                <Avatar.Fallback color="white" fontWeight="bold" fontSize="xs">
                                  {customer.name?.charAt(0) || "?"}
                                </Avatar.Fallback>
                              </Avatar.Root>
                              <Box minW={0}>
                                <Text fontWeight="bold" color="#2d3748" lineClamp={1}>
                                  {customer.name || "عميل بدون اسم"}
                                </Text>
                                <Text fontSize="sm" color="gray.500" dir="ltr" textAlign="right">
                                  {customer.phone || "—"}
                                </Text>
                              </Box>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell py={4} px={3} textAlign="center">
                            <Flex justify="center">
                              <WhatsAppCustomerLink
                                phone={customer.phone}
                                stopClickPropagation
                                showPhoneTooltip
                                boxSize="40px"
                                iconSize={21}
                                pill
                              />
                            </Flex>
                          </Table.Cell>
                          <Table.Cell py={4} px={4}>
                            <Badge colorPalette="purple" variant="subtle" rounded="full" px={3} py={1}>
                              {customer.totalBookings || 0} حجز
                            </Badge>
                          </Table.Cell>
                          <Table.Cell py={4} px={4}>
                            {renderStatusBadges(customer)}
                          </Table.Cell>
                          <Table.Cell py={4} px={4}>
                            {renderTypeBadges(customer)}
                          </Table.Cell>
                          <Table.Cell py={4} px={4}>
                            <Flex align="center" gap={2} color="gray.700">
                              <Clock size={15} color="#666139" />
                              <Text>{formatDate(customer.lastBookingDate)}</Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell py={4} px={4}>
                            <Text color="gray.700">{formatDateTime(customer.lastRegisteredAt)}</Text>
                            <Text fontSize="xs" color="gray.400">
                              أول تسجيل: {formatDate(customer.firstRegisteredAt)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell py={4} px={4} textAlign="center">
                            <IconButton
                              aria-label="عرض سجل العميل"
                              size="sm"
                              variant="ghost"
                              colorPalette="blue"
                              disabled={lastBookingId == null}
                              onClick={() => {
                                if (lastBookingId != null) {
                                  router.push(`/patient-history/${lastBookingId}`);
                                }
                              }}
                            >
                              <ChevronLeft size={17} />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })
                  )}
                </Table.Body>
              </Table.Root>
            </Box>

            {renderPaginationControls("bottom")}
          </Card.Root>
        )}
      </Container>
    </Box>
  );
}
