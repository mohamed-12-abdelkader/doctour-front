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
import {
  Fragment,
  useState,
  useMemo,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Booking,
  BookingType,
  BookingStatus,
  ExaminationStatus,
  CreateClinicBookingData,
  UpdateBookingData,
  CLINIC_PAYMENT_OPTIONS,
  type ClinicPaymentMethod,
} from "@/types/booking";
import {
  formatBookingAmount,
  formatBookingTime,
  getPaymentInfo,
  getProcedureTypes,
  getVisitTypeLabel,
  hasBookingSpecificTime,
  matchesPaymentFilter,
  paymentBadgeColors,
  type PaymentFilterValue,
} from "@/lib/booking-display";
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
  Download,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  ChevronDown,
  CheckCircle,
  Clock,
  CalendarClock,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/lib/axios";
import { WhatsAppCustomerLink } from "@/components/WhatsAppCustomerLink";
import {
  canChangeExaminationStatus,
  canChooseDoctor,
  getCurrentDoctorId,
  getCurrentRole,
  setSelectedDoctorId,
} from "@/lib/doctor-context";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

function getInclusiveDateCount(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 1;
  return Math.max(1, Math.floor((endTime - startTime) / 86400000) + 1);
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

export default function TodayBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | BookingType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | BookingStatus>(
    "all"
  );
  const [filterProcedure, setFilterProcedure] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] =
    useState<PaymentFilterValue>("all");
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
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultNoTime, setModalDefaultNoTime] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [doctors, setDoctors] = useState<Array<{ id: number; name?: string; user?: { name?: string } }>>([]);
  const [selectedDoctorId, setDoctorId] = useState<number>(0);
  const [canSelectDoctor, setCanSelectDoctor] = useState(false);
  const [canManageExamination, setCanManageExamination] = useState(false);
  const [showTotalIncome, setShowTotalIncome] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    25,
  );
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [serverPaginated, setServerPaginated] = useState(false);
  const [expandedActionBookingId, setExpandedActionBookingId] = useState<number | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [changingExaminationId, setChangingExaminationId] = useState<number | null>(
    null,
  );
  const selectedRangeDays = useMemo(
    () => getInclusiveDateCount(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );
  const liveSearchTerm = searchQuery.trim();
  const searchTerm = debouncedSearchQuery.trim();
  const clientFilterActive =
    liveSearchTerm.length > 0 ||
    filterStatus !== "all" ||
    filterProcedure !== "all" ||
    filterPaymentMethod !== "all";
  const canUseServerPagination = !clientFilterActive;
  const activeServerPaginated = serverPaginated && canUseServerPagination;
  const serverPageKey =
    activeServerPaginated
      ? `${currentPage}:${pageSize}`
      : "client-page";

  useEffect(() => {
    const role = getCurrentRole();
    const canSelect = canChooseDoctor(role);
    setCanSelectDoctor(canSelect);
    setCanManageExamination(canChangeExaminationStatus(role));
    const current = getCurrentDoctorId();
    if (current) setDoctorId(current);
  }, []);

  useEffect(() => {
    return () => fetchAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!canSelectDoctor) return;
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
  }, [canSelectDoctor]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const fetchBookings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    try {
      const params: any = {};

      // نوع الحجز
      if (filterType !== "all") params.type = filterType;

      // نرسل الملغي فقط للسيرفر. تب "انتظار" يعتمد على حالة الكشف محليًا.
      if (filterStatus === "cancelled") params.status = filterStatus;

      // قواعد الأولوية حسب الـ doc:
      if (rangeStart === rangeEnd) {
        // يوم واحد → params.date فقط (الـ API بيتجاهل startDate/endDate)
        params.date = rangeStart;
      } else {
        // نطاق → startDate + endDate
        params.startDate = rangeStart;
        params.endDate = rangeEnd;
      }
      if (selectedDoctorId) params.doctorId = selectedDoctorId;
      if (canUseServerPagination) {
        params.page = currentPage;
        params.limit = pageSize;
      } else if (clientFilterActive) {
        // عند البحث أو الفلاتر المحلية نحتاج كل نتائج النطاق ثم نفلتر في الفرونت.
        params.page = 1;
        params.limit = 10000;
      }

      const response = await api.get("/bookings/all", {
        params,
        signal: controller.signal,
      });

      // الـ API الجديد بيرجع { total, bookings } أو مصفوفة مباشرة (backward compat)
      const data = response.data;
      const nextBookings = Array.isArray(data) ? data : (data.bookings ?? []);
      const totalFromResponse = Number(
        data?.total ??
          data?.pagination?.total ??
          data?.meta?.total ??
          nextBookings.length,
      );
      const nextServerTotal = Number.isFinite(totalFromResponse)
        ? totalFromResponse
        : nextBookings.length;
      const nextServerPaginated =
        canUseServerPagination && nextServerTotal > nextBookings.length;
      startTransition(() => {
        setBookings(nextBookings);
        setServerTotal(nextServerTotal);
        setServerPaginated(nextServerPaginated);
      });
    } catch (error: any) {
      if (
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED" ||
        controller.signal.aborted
      ) {
        return;
      }
      if (!silent) {
        toaster.create({
          title: "خطأ في جلب البيانات",
          description: error.response?.data?.message || "حدث خطأ أثناء جلب الحجوزات",
          type: "error",
          duration: 3000,
        });
      }
    } finally {
      const isLatestRequest = fetchAbortRef.current === controller;
      if (isLatestRequest) {
        fetchAbortRef.current = null;
        if (!silent) setIsLoading(false);
      }
    }
  };

  // جلب أولي وعند تغيير الفلاتر/التاريخ
  useEffect(() => {
    fetchBookings();
  }, [
    filterType,
    filterStatus,
    rangeStart,
    rangeEnd,
    selectedDoctorId,
    searchTerm,
    serverPageKey,
    canUseServerPagination,
  ]);

  // ريل تايم لليوم الواحد فقط؛ النطاقات الكبيرة كانت تعيد تحميل آلاف الحجوزات كل ثواني.
  useEffect(() => {
    if (selectedRangeDays > 1) return;
    const POLL_INTERVAL_MS = 15000;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchBookings(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [
    filterType,
    filterStatus,
    rangeStart,
    rangeEnd,
    selectedDoctorId,
    selectedRangeDays,
    searchTerm,
    serverPageKey,
    canUseServerPagination,
  ]);

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

  const indexedBookings = useMemo(
    () =>
      bookings.map((booking) => ({
        booking,
        procedures: getProcedureTypes(booking),
        searchText: normalizeSearchText(
          `${booking.customerName ?? ""} ${booking.customerPhone ?? ""}`,
        ),
      })),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let list = indexedBookings;

    if (filterPaymentMethod !== "all") {
      list = list.filter(({ booking }) =>
        matchesPaymentFilter(booking, filterPaymentMethod),
      );
    }

    if (filterProcedure !== "all") {
      list = list.filter(({ procedures }) => procedures.includes(filterProcedure));
    }

    if (filterStatus === "pending") {
      list = list.filter(
        ({ booking }) =>
          booking.examinationStatus !== "done" &&
          booking.status !== "cancelled" &&
          booking.status !== "rejected",
      );
    } else if (filterStatus === "cancelled") {
      list = list.filter(({ booking }) => booking.status === "cancelled");
    }

    const query = liveSearchTerm;
    if (!query) return list.map(({ booking }) => booking);
    const searchLower = normalizeSearchText(query);
    return list
      .filter(({ searchText }) => searchText.includes(searchLower))
      .map(({ booking }) => booking);
  }, [indexedBookings, liveSearchTerm, filterProcedure, filterPaymentMethod]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    liveSearchTerm,
    filterType,
    filterStatus,
    filterProcedure,
    filterPaymentMethod,
    rangeStart,
    rangeEnd,
    selectedDoctorId,
    pageSize,
  ]);

  const effectiveTotal = activeServerPaginated
    ? (serverTotal ?? filteredBookings.length)
    : filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const visibleBookings = useMemo(() => {
    if (activeServerPaginated) return filteredBookings;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, safeCurrentPage, pageSize, activeServerPaginated]);

  const visibleStart = effectiveTotal === 0
    ? 0
    : (safeCurrentPage - 1) * pageSize + 1;
  const visibleEnd = activeServerPaginated
    ? Math.min(visibleStart + visibleBookings.length - 1, effectiveTotal)
    : Math.min(safeCurrentPage * pageSize, effectiveTotal);

  const procedureOptions = useMemo(
    () => {
      const set = new Set<string>();
      for (const item of indexedBookings) {
        for (const procedure of item.procedures) set.add(procedure);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
    },
    [indexedBookings],
  );

  const totalIncome = useMemo(() => {
    if (!showTotalIncome) return 0;
    return filteredBookings.reduce((sum, b) => {
      const amount =
        typeof b.amountPaid === "string"
          ? parseFloat(b.amountPaid)
          : b.amountPaid;
      return sum + (amount || 0);
    }, 0);
  }, [filteredBookings, showTotalIncome]);

  const incomeByPaymentMethod = useMemo(() => {
    if (!showTotalIncome) return [];
    const map = new Map<
      ClinicPaymentMethod | "none",
      { label: string; amount: number }
    >();

    for (const booking of filteredBookings) {
      const details = Array.isArray(booking.paymentDetails)
        ? booking.paymentDetails
        : [];

      if (details.length > 0) {
        for (const payment of details) {
          const method = payment.method ?? "none";
          const label =
            payment.methodLabel ||
            CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === method)
              ?.label ||
            String(method);
          const current = map.get(method) ?? { label, amount: 0 };
          current.amount += Number(payment.amount ?? 0);
          map.set(method, current);
        }
        continue;
      }

      const method = booking.paymentMethod ?? "none";
      const label =
        booking.paymentMethodLabel ||
        CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === method)?.label ||
        "غير محدد";
      const current = map.get(method) ?? { label, amount: 0 };
      current.amount +=
        typeof booking.amountPaid === "string"
          ? parseFloat(booking.amountPaid) || 0
          : Number(booking.amountPaid ?? 0);
      map.set(method, current);
    }

    return Array.from(map.values()).filter((row) => row.amount > 0);
  }, [filteredBookings, showTotalIncome]);

  function buildClinicPayload(
    data: CreateClinicBookingData,
    allowExtraBooking = false,
  ): Record<string, unknown> {
    const procedureTypes = data.procedureTypes ?? data.visitTypes ?? [];
    const paymentAmount = Number(data.amountPaid ?? 0);
    const payments =
      Array.isArray(data.payments) && data.payments.length > 0
        ? data.payments.map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount),
            ...(payment.transferFromPhone
              ? { transferFromPhone: payment.transferFromPhone.replace(/\D/g, "") }
              : {}),
          }))
        : [];
    const payload: Record<string, unknown> = {
      name: data.name,
      phone: data.phone,
      ...(data.age != null ? { age: data.age } : {}),
      date: data.date,
      doctorId: data.doctorId,
      procedureTypes,
      noTime: data.noTime === true,
      allowExtraBooking: allowExtraBooking || data.allowExtraBooking === true,
      clientRequestId:
        data.clientRequestId ??
        `clinic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };
    if (payments.length > 1) {
      payload.payments = payments;
    } else {
      const singlePayment = payments[0];
      payload.paymentMethod = data.paymentMethod ?? singlePayment?.method;
      payload.amountPaid = Number.isFinite(paymentAmount) ? paymentAmount : 0;
      const transferFromPhone =
        data.transferFromPhone ?? singlePayment?.transferFromPhone;
      if (transferFromPhone) {
        payload.transferFromPhone = transferFromPhone.replace(/\D/g, "");
      }
    }
    if (!data.noTime && data.time) {
      payload.time = data.time;
    }
    return payload;
  }

  const handleCreateBooking = async (data: CreateClinicBookingData) => {
    const tryCreate = async (allowExtra: boolean): Promise<void> => {
      try {
        await api.post(
          "/bookings/clinic",
          buildClinicPayload(data, allowExtra),
        );
        toaster.create({
          title: allowExtra ? "تم إضافة حجز إضافي" : "تم إنشاء الحجز بنجاح",
          type: "success",
          duration: 2000,
        });
        fetchBookings();
        setIsModalOpen(false);
        setModalDefaultNoTime(false);
      } catch (error: any) {
        if (error.response?.status === 409 && !allowExtra) {
          const msg =
            error.response?.data?.message || "امتلأت سعة اليوم لهذا الطبيب.";
          const confirmed = confirm(
            `${msg}\n\nهل تريد إضافة حجز إضافي؟`,
          );
          if (confirmed) {
            await tryCreate(true);
            return;
          }
          toaster.create({
            title: "لم يتم الحجز",
            description: msg,
            type: "warning",
            duration: 4000,
          });
          throw error;
        }
        toaster.create({
          title: "خطأ في إنشاء الحجز",
          description: error.response?.data?.message || "حدث خطأ",
          type: "error",
          duration: 3000,
        });
        throw error;
      }
    };
    await tryCreate(false);
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
      throw error;
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
    setModalDefaultNoTime(false);
    setIsModalOpen(true);
  };

  const handleAddNoTimeClick = () => {
    setEditingBooking(null);
    setModalDefaultNoTime(true);
    setIsModalOpen(true);
  };

  const handleEditClick = (booking: Booking) => {
    setEditingBooking(booking);
    setIsModalOpen(true);
  };

  const handleSaveBooking = async (data: any) => {
    const procedureTypes = Array.isArray(data.procedureTypes)
      ? data.procedureTypes
      : Array.isArray(data.visitTypes)
        ? data.visitTypes
        : undefined;
    const noTime = data.noTime === true;
    if (editingBooking) {
      const updatePayload: UpdateBookingData & { procedureTypes?: string[] } = {
        name: data.name ?? data.customerName,
        phone: data.phone ?? data.customerPhone,
        age:
          data.age != null && Number.isFinite(Number(data.age))
            ? Number(data.age)
            : undefined,
        amountPaid:
          typeof data.amountPaid === "string"
            ? parseInt(data.amountPaid, 10)
            : data.amountPaid,
        paymentMethod: data.paymentMethod,
        transferFromPhone:
          typeof data.transferFromPhone === "string"
            ? data.transferFromPhone.replace(/\D/g, "")
            : undefined,
        payments: Array.isArray(data.payments) ? data.payments : undefined,
        visitTypes: procedureTypes,
        ...(data.visitType != null ? { visitType: data.visitType } : {}),
      };
      updatePayload.procedureTypes = procedureTypes;
      await handleUpdateBooking(editingBooking.id, updatePayload);
      return;
    }

    const normalized: CreateClinicBookingData = {
      name: data.name ?? data.customerName,
      phone: data.phone ?? data.customerPhone,
      age:
        data.age != null && Number.isFinite(Number(data.age))
          ? Number(data.age)
          : undefined,
      date: data.date ?? data.appointmentDate,
      doctorId: Number(data.doctorId ?? selectedDoctorId) || undefined,
      amountPaid:
        typeof data.amountPaid === "string"
          ? parseInt(data.amountPaid, 10)
          : data.amountPaid,
      paymentMethod: data.paymentMethod,
      transferFromPhone:
        typeof data.transferFromPhone === "string"
          ? data.transferFromPhone.replace(/\D/g, "")
          : undefined,
      payments:
        Array.isArray(data.payments) && data.payments.length > 0
          ? data.payments
          : data.paymentMethod && data.amountPaid != null
            ? [
                {
                  method: data.paymentMethod,
                  amount:
                    typeof data.amountPaid === "string"
                      ? parseInt(data.amountPaid, 10)
                      : data.amountPaid,
                  ...(typeof data.transferFromPhone === "string" &&
                  data.transferFromPhone
                    ? { transferFromPhone: data.transferFromPhone.replace(/\D/g, "") }
                    : {}),
                },
              ]
            : undefined,
      procedureTypes,
      visitTypes: procedureTypes,
      noTime,
      allowExtraBooking: false,
      clientRequestId: `clinic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ...(noTime ? {} : { time: data.time ?? data.timeSlot }),
      ...(editingBooking && data.visitType != null
        ? { visitType: data.visitType }
        : {}),
    };
    await handleCreateBooking(normalized);
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
          bg="#dcfce7"
          color="#166534"
          border="1px solid"
          borderColor="#86efac"
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
    if (examinationStatus === "done") return "#ecfdf5";
    if (examinationStatus === "waiting") return "yellow.50";
    return undefined;
  };

  const getRoleLabel = (role?: string | null) => {
    if (role === "admin") return "مدير";
    if (role === "doctor") return "طبيب";
    if (role === "secretary") return "سكرتير";
    if (role === "staff") return "موظف";
    return role || "مستخدم";
  };

  const formatActionTime = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getLatestAction = (booking: Booking) => {
    const actions = Array.isArray(booking.actions) ? booking.actions : [];
    if (actions.length > 0) {
      return actions.reduce((latest, action) => {
        const latestTime = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
        const actionTime = action.createdAt ? new Date(action.createdAt).getTime() : 0;
        return actionTime >= latestTime ? action : latest;
      }, actions[actions.length - 1]);
    }
    if (booking.assignedByUser) {
      return {
        actionLabel: "تم بواسطة",
        user: booking.assignedByUser,
        createdAt: booking.createdAt,
      };
    }
    return null;
  };

  const renderActionActor = (booking: Booking, compact = false) => {
    const latestAction = getLatestAction(booking);
    const user = latestAction?.user;
    if (!latestAction || !user?.name) {
      return (
        <Text fontSize="sm" color="gray.400">
          —
        </Text>
      );
    }

    const actionLabel = latestAction.actionLabel || "إجراء على الحجز";
    const fields = Array.isArray(latestAction.metadata?.fields)
      ? latestAction.metadata.fields
      : [];
    const timeLabel = formatActionTime(latestAction.createdAt);

    return (
      <Flex
        align="center"
        gap={compact ? 2 : 2.5}
        bg={compact ? "white" : "#f8fafc"}
        border="1px solid"
        borderColor={compact ? "gray.200" : "gray.100"}
        borderRadius="xl"
        px={compact ? 3 : 3.5}
        py={compact ? 2 : 2.5}
        boxShadow={compact ? "none" : "xs"}
        maxW="full"
      >
        <Avatar.Root size={compact ? "xs" : "sm"} bg="#666139" flexShrink={0}>
          <Avatar.Fallback color="white" fontWeight="bold" fontSize="xs">
            {user.name.charAt(0)}
          </Avatar.Fallback>
        </Avatar.Root>
        <Box minW={0}>
          <Flex align="center" gap={1.5} wrap="wrap">
            <Text
              fontSize={compact ? "xs" : "sm"}
              fontWeight="bold"
              color="#2d3748"
              lineClamp={1}
            >
              {user.name}
            </Text>
            <Badge
              colorPalette="gray"
              variant="subtle"
              fontSize="10px"
              rounded="full"
              px={1.5}
            >
              {getRoleLabel(user.role)}
            </Badge>
          </Flex>
          <Flex align="center" gap={1.5} color="gray.500" mt={0.5} wrap="wrap">
            <CheckCircle size={12} color="#666139" />
            <Text fontSize="xs" lineClamp={1}>
              {actionLabel}
            </Text>
            {timeLabel && (
              <Text fontSize="10px" color="gray.400">
                {timeLabel}
              </Text>
            )}
          </Flex>
          {fields.length > 0 && !compact && (
            <Text fontSize="10px" color="gray.400" mt={0.5} lineClamp={1}>
              الحقول: {fields.join("، ")}
            </Text>
          )}
        </Box>
      </Flex>
    );
  };

  const renderBookingActionDetails = (booking: Booking) => {
    const actions = Array.isArray(booking.actions) ? booking.actions : [];
    const fallbackAction = getLatestAction(booking);
    const visibleActions = actions.length > 0 ? actions : fallbackAction ? [fallbackAction] : [];

    if (visibleActions.length === 0) {
      return (
        <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.100" p={4}>
          <Text color="gray.500" fontSize="sm">
            لا توجد بيانات إجراءات لهذا الحجز.
          </Text>
        </Box>
      );
    }

    return (
      <Box bg="#f8fafc" borderRadius="xl" border="1px solid" borderColor="gray.100" p={4}>
        <Flex align="center" justify="space-between" gap={3} mb={4} wrap="wrap">
          <Box>
            <Text fontWeight="bold" color="#2d3748">
              سجل إجراءات الحجز
            </Text>
            <Text fontSize="sm" color="gray.500">
              {booking.customerName} - رقم الحجز #{booking.id}
            </Text>
          </Box>
          <Badge colorPalette="gray" variant="subtle" rounded="full" px={3}>
            {visibleActions.length} إجراء
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
          {visibleActions.map((action, actionIndex) => {
            const user = action.user;
            const fields = Array.isArray(action.metadata?.fields)
              ? action.metadata.fields
              : [];
            const timeLabel = formatActionTime(action.createdAt);

            return (
              <Flex
                key={`${action.action || "action"}-${action.createdAt || actionIndex}`}
                align="flex-start"
                gap={3}
                bg="white"
                border="1px solid"
                borderColor="gray.100"
                borderRadius="xl"
                p={4}
              >
                <Avatar.Root size="sm" bg="#666139" flexShrink={0}>
                  <Avatar.Fallback color="white" fontWeight="bold" fontSize="xs">
                    {user?.name?.charAt(0) || "?"}
                  </Avatar.Fallback>
                </Avatar.Root>
                <Box minW={0} flex={1}>
                  <Flex align="center" gap={2} wrap="wrap">
                    <Text fontWeight="bold" color="#1f2937">
                      {user?.name || "مستخدم غير معروف"}
                    </Text>
                    <Badge colorPalette="gray" variant="subtle" rounded="full" px={2}>
                      {getRoleLabel(user?.role)}
                    </Badge>
                  </Flex>
                  <Flex align="center" gap={2} color="gray.600" mt={1} wrap="wrap">
                    <CheckCircle size={14} color="#666139" />
                    <Text fontSize="sm">
                      {action.actionLabel || "إجراء على الحجز"}
                    </Text>
                    {timeLabel && (
                      <Text fontSize="xs" color="gray.400">
                        {timeLabel}
                      </Text>
                    )}
                  </Flex>
                  {fields.length > 0 && (
                    <Flex gap={1.5} mt={2} wrap="wrap">
                      {fields.map((field) => (
                        <Badge
                          key={field}
                          colorPalette="blue"
                          variant="outline"
                          rounded="full"
                          fontSize="10px"
                        >
                          {field}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Box>
              </Flex>
            );
          })}
        </SimpleGrid>
      </Box>
    );
  };

  const handleExaminationStatusChange = async (
    id: number,
    examinationStatus: ExaminationStatus,
  ) => {
    setChangingExaminationId(id);
    try {
      const res = await api.patch(`/bookings/${id}/examination-status`, {
        examinationStatus,
      });
      const updated = res.data?.booking as Booking | undefined;
      if (updated?.id) {
        setBookings((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)),
        );
      }
      toaster.create({
        title: res.data?.message || "تم تحديث حالة الكشف",
        type: "success",
        duration: 2000,
      });
      void fetchBookings(true);
    } catch (error: any) {
      toaster.create({
        title: "خطأ في تحديث حالة الكشف",
        description:
          error.response?.data?.message || "غير مصرح أو حدث خطأ",
        type: "error",
        duration: 3000,
      });
    } finally {
      setChangingExaminationId(null);
    }
  };

  const renderExaminationCell = (booking: Booking) => (
    <Flex
      align="center"
      gap={2}
      flexWrap="wrap"
      justify="flex-start"
      onClick={(e) => e.stopPropagation()}
    >
      {changingExaminationId === booking.id && (
        <Flex align="center" gap={1} color="gray.500">
          <Spinner size="xs" />
          <Text fontSize="xs">جارِ التغيير...</Text>
        </Flex>
      )}
      {getExaminationStatusBadge(booking.examinationStatus)}
      {canManageExamination && (
        <MenuRoot>
          <MenuTrigger asChild>
            <IconButton
              aria-label="تغيير حالة الكشف"
              size="xs"
              variant="ghost"
              colorPalette="gray"
            >
              <ChevronDown size={14} />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem
              value="waiting"
              onClick={() =>
                handleExaminationStatusChange(booking.id, "waiting")
              }
              disabled={changingExaminationId === booking.id}
            >
              <Clock size={14} /> في الانتظار
            </MenuItem>
            <MenuItem
              value="done"
              color="green.500"
              onClick={() => handleExaminationStatusChange(booking.id, "done")}
              disabled={changingExaminationId === booking.id}
            >
              <CheckCircle size={14} /> تم الكشف
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      )}
    </Flex>
  );

  const handlePrint = () => {
    setShowTotalIncome(true);
    window.setTimeout(() => window.print(), 50);
  };

  const renderProcedureTags = (booking: Booking, compact = false) => {
    const types = getProcedureTypes(booking);
    if (types.length === 0) {
      return (
        <Text fontSize="sm" color="gray.400">
          —
        </Text>
      );
    }
    return (
      <Flex wrap="wrap" gap={1.5}>
        {types.map((t) => (
          <Badge
            key={`${booking.id}-${t}`}
            variant="subtle"
            bg="#f4f3ed"
            color="#615b36"
            border="1px solid"
            borderColor="#e8e4d4"
            fontSize="xs"
            px={2}
            py={0.5}
            rounded="md"
            fontWeight="medium"
          >
            {t}
          </Badge>
        ))}
      </Flex>
    );
  };

  const renderPaymentBadges = (booking: Booking) => {
    const details = Array.isArray(booking.paymentDetails)
      ? booking.paymentDetails
      : [];

    if (details.length > 0) {
      return (
        <Flex wrap="wrap" gap={1.5}>
          {details.map((payment, index) => {
            const colors = paymentBadgeColors(payment.method);
            const label =
              payment.methodLabel ||
              CLINIC_PAYMENT_OPTIONS.find((o) => o.value === payment.method)
                ?.label ||
              payment.method;
            return (
              <Badge
                key={`${booking.id}-${payment.method}-${index}`}
                display="inline-flex"
                alignItems="center"
                gap={1}
                bg={colors.bg}
                color={colors.color}
                border="1px solid"
                borderColor={colors.border}
                fontSize="xs"
                px={2}
                py={1}
                rounded="lg"
                fontWeight="semibold"
              >
                <CreditCard size={12} />
                {label}: {formatBookingAmount(payment.amount)} EGP
              </Badge>
            );
          })}
        </Flex>
      );
    }

    const { method, label } = getPaymentInfo(booking);
    const colors = paymentBadgeColors(method);
    return (
      <Badge
        display="inline-flex"
        alignItems="center"
        gap={1}
        bg={colors.bg}
        color={colors.color}
        border="1px solid"
        borderColor={colors.border}
        fontSize="xs"
        px={2}
        py={1}
        rounded="lg"
        fontWeight="semibold"
      >
        <CreditCard size={12} />
        {label}
      </Badge>
    );
  };

  const getBookingPaymentDetails = (booking: Booking) => {
    const details = Array.isArray(booking.paymentDetails)
      ? booking.paymentDetails
      : [];
    if (details.length > 0) return details;

    const amount =
      typeof booking.amountPaid === "string"
        ? parseFloat(booking.amountPaid) || 0
        : Number(booking.amountPaid ?? 0);
    const { method, label } = getPaymentInfo(booking);

    return [
      {
        amount,
        method,
        methodLabel: label,
        transferFromPhone: booking.transferFromPhone ?? undefined,
      },
    ];
  };

  const renderPaymentDetailsPanel = (booking: Booking) => {
    const details = getBookingPaymentDetails(booking);
    const hasTransferPhone = details.some((payment) => payment.transferFromPhone);

    return (
      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.100" p={4}>
        <Flex align="center" justify="space-between" gap={3} mb={3} wrap="wrap">
          <Box>
            <Text fontWeight="bold" color="#2d3748">
              تفاصيل الدفع
            </Text>
            <Text fontSize="sm" color="gray.500">
              أرقام التحويل تظهر هنا فقط عند فتح تفاصيل الحجز.
            </Text>
          </Box>
          {hasTransferPhone && (
            <Badge colorPalette="green" variant="subtle" rounded="full" px={3}>
              يوجد رقم تحويل
            </Badge>
          )}
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
          {details.map((payment, index) => {
            const method = payment.method ?? booking.paymentMethod ?? null;
            const colors = paymentBadgeColors(method);
            const label =
              payment.methodLabel ||
              CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === payment.method)
                ?.label ||
              String(method || "غير محدد");

            return (
              <Box
                key={`${booking.id}-payment-detail-${method}-${index}`}
                bg={colors.bg}
                border="1px solid"
                borderColor={colors.border}
                borderRadius="xl"
                p={3}
              >
                <Flex align="center" justify="space-between" gap={3}>
                  <Flex align="center" gap={2} color={colors.color} fontWeight="bold">
                    <CreditCard size={15} />
                    <Text fontSize="sm">{label}</Text>
                  </Flex>
                  <Text fontSize="sm" fontWeight="bold" color={colors.color}>
                    {formatBookingAmount(payment.amount)} EGP
                  </Text>
                </Flex>
                {payment.transferFromPhone ? (
                  <Box mt={3} bg="whiteAlpha.800" borderRadius="lg" px={3} py={2}>
                    <Text fontSize="xs" color="gray.500">
                      رقم المحوّل منه
                    </Text>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="#1f2937"
                      dir="ltr"
                      textAlign="right"
                    >
                      {payment.transferFromPhone}
                    </Text>
                  </Box>
                ) : (
                  <Text fontSize="xs" color="gray.500" mt={3}>
                    لا يوجد رقم تحويل لهذه الطريقة
                  </Text>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
      </Box>
    );
  };

  const getStatusLabel = (status?: BookingStatus | string | null) => {
    if (status === "confirmed") return "مؤكد";
    if (status === "pending") return "قيد الانتظار";
    if (status === "cancelled") return "ملغي";
    if (status === "rejected") return "مرفوض";
    return status || "غير محدد";
  };

  const getExaminationStatusLabel = (status?: ExaminationStatus | string | null) => {
    if (status === "done") return "تم الكشف";
    if (status === "waiting") return "انتظار";
    return "غير محدد";
  };

  const getBookingTypeLabel = (type?: BookingType | string | null) => {
    if (type === "clinic") return "عيادة";
    if (type === "online") return "أونلاين";
    return type || "غير محدد";
  };

  const formatExportDateTime = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const buildExportBaseParams = () => {
    const params: Record<string, string | number> = {
      page: 1,
      limit: 10000,
    };

    if (filterType !== "all") params.type = filterType;
    if (filterStatus === "cancelled") params.status = filterStatus;
    if (rangeStart === rangeEnd) {
      params.date = rangeStart;
    } else {
      params.startDate = rangeStart;
      params.endDate = rangeEnd;
    }
    if (selectedDoctorId) params.doctorId = selectedDoctorId;

    return params;
  };

  const applyExportFilters = (sourceBookings: Booking[]) => {
    let list = sourceBookings.map((booking) => ({
      booking,
      procedures: getProcedureTypes(booking),
      searchText: normalizeSearchText(
        `${booking.customerName ?? ""} ${booking.customerPhone ?? ""}`,
      ),
    }));

    if (filterPaymentMethod !== "all") {
      list = list.filter(({ booking }) =>
        matchesPaymentFilter(booking, filterPaymentMethod),
      );
    }

    if (filterProcedure !== "all") {
      list = list.filter(({ procedures }) => procedures.includes(filterProcedure));
    }

    if (filterStatus === "pending") {
      list = list.filter(
        ({ booking }) =>
          booking.examinationStatus !== "done" &&
          booking.status !== "cancelled" &&
          booking.status !== "rejected",
      );
    } else if (filterStatus === "cancelled") {
      list = list.filter(({ booking }) => booking.status === "cancelled");
    }

    const query = liveSearchTerm;
    if (query) {
      const searchLower = normalizeSearchText(query);
      list = list.filter(({ searchText }) => searchText.includes(searchLower));
    }

    return list.map(({ booking }) => booking);
  };

  const buildExcelHtml = (rows: Array<Array<unknown>>) => {
    const headers = [
      "رقم",
      "اسم العميل",
      "الهاتف",
      "السن",
      "التاريخ",
      "الوقت",
      "نوع الحجز",
      "الخدمات",
      "حالة الحجز",
      "حالة الكشف",
      "إجمالي المدفوع",
      "تفاصيل الدفع",
      "أرقام التحويل",
      "آخر إجراء",
      "منفذ آخر إجراء",
      "سجل الإجراءات",
      "تاريخ الإنشاء",
      "آخر تحديث",
    ];

    const headerHtml = headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("");
    const bodyHtml = rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td style="mso-number-format:'\\@';">${escapeHtml(cell)}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { direction: rtl; font-family: Tahoma, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #615b36; color: #fff; font-weight: bold; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: right; vertical-align: top; }
    td { color: #111827; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`;
  };

  const downloadExcelFile = (html: string) => {
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const datePart =
      rangeStart === rangeEnd ? rangeStart : `${rangeStart}_to_${rangeEnd}`;
    a.href = url;
    a.download = `today-bookings-${datePart}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const response = await api.get("/bookings/all", {
        params: buildExportBaseParams(),
      });
      const data = response.data;
      const sourceBookings = (Array.isArray(data)
        ? data
        : (data.bookings ?? [])) as Booking[];
      const exportBookings = applyExportFilters(sourceBookings);

      if (exportBookings.length === 0) {
        toaster.create({
          title: "لا توجد بيانات للتصدير",
          description: "غيّر الفلاتر أو التاريخ ثم حاول مرة أخرى.",
          type: "info",
          duration: 2500,
        });
        return;
      }

      const rows = exportBookings.map((booking, index) => {
        const payments = getBookingPaymentDetails(booking);
        const paymentSummary = payments
          .map((payment) => {
            const label =
              payment.methodLabel ||
              CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === payment.method)
                ?.label ||
              String(payment.method || "غير محدد");
            return `${label}: ${formatBookingAmount(payment.amount)} EGP`;
          })
          .join(" | ");
        const transferPhones = payments
          .filter((payment) => payment.transferFromPhone)
          .map((payment) => {
            const label =
              payment.methodLabel ||
              CLINIC_PAYMENT_OPTIONS.find((opt) => opt.value === payment.method)
                ?.label ||
              String(payment.method || "غير محدد");
            return `${label}: ${payment.transferFromPhone}`;
          })
          .join(" | ");
        const latestAction = getLatestAction(booking);
        const latestUser = latestAction?.user;
        const actionsSummary = (Array.isArray(booking.actions) ? booking.actions : [])
          .map((action) => {
            const fields = Array.isArray(action.metadata?.fields)
              ? ` (${action.metadata.fields.join("، ")})`
              : "";
            return `${action.actionLabel || action.action || "إجراء"} - ${
              action.user?.name || "مستخدم غير معروف"
            } - ${formatExportDateTime(action.createdAt)}${fields}`;
          })
          .join(" | ");

        return [
          index + 1,
          booking.customerName,
          booking.customerPhone,
          booking.age ?? "",
          booking.slotDate || booking.appointmentDate?.slice(0, 10) || "",
          formatBookingTime(booking),
          getBookingTypeLabel(booking.bookingType),
          getProcedureTypes(booking).join("، "),
          getStatusLabel(booking.status),
          getExaminationStatusLabel(booking.examinationStatus),
          `${formatBookingAmount(booking.amountPaid)} EGP`,
          paymentSummary,
          transferPhones,
          latestAction?.actionLabel || latestAction?.action || "",
          latestUser
            ? `${latestUser.name || "مستخدم"} (${getRoleLabel(latestUser.role)})`
            : "",
          actionsSummary,
          formatExportDateTime(booking.createdAt),
          formatExportDateTime(booking.updatedAt),
        ];
      });

      downloadExcelFile(buildExcelHtml(rows));
      toaster.create({
        title: "تم تصدير الحجوزات",
        description: `تم إنشاء ملف يحتوي على ${exportBookings.length} حجز.`,
        type: "success",
        duration: 2500,
      });
    } catch (error: any) {
      toaster.create({
        title: "فشل تصدير الحجوزات",
        description:
          error.response?.data?.message || "حدث خطأ أثناء تجهيز ملف الإكسل.",
        type: "error",
        duration: 3000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderPaginationControls = (placement: "top" | "bottom" = "bottom") => {
    if (effectiveTotal === 0) return null;
    const isBottom = placement === "bottom";
    const pageNumbers: Array<number | "ellipsis-start" | "ellipsis-end"> =
      totalPages <= 7
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : [
            1,
            ...(safeCurrentPage > 4 ? (["ellipsis-start"] as const) : []),
            ...Array.from(
              new Set(
                [
                  safeCurrentPage - 1,
                  safeCurrentPage,
                  safeCurrentPage + 1,
                ].filter((p) => p > 1 && p < totalPages),
              ),
            ),
            ...(safeCurrentPage < totalPages - 3
              ? (["ellipsis-end"] as const)
              : []),
            totalPages,
          ];

    return (
      <Flex
        className="no-print"
        align={isBottom ? "stretch" : "center"}
        justify="space-between"
        gap={3}
        p={isBottom ? 5 : 4}
        borderTop={isBottom ? "1px solid" : undefined}
        borderBottom={isBottom ? undefined : "1px solid"}
        borderColor="gray.100"
        bg={isBottom ? "#f9fafb" : "white"}
        flexWrap="wrap"
        direction={{ base: isBottom ? "column" : "row", md: "row" }}
      >
        <Box>
          <Text fontSize={isBottom ? "md" : "sm"} color="gray.700" fontWeight="bold">
            صفحة {safeCurrentPage} من {totalPages}
          </Text>
          <Text fontSize="xs" color="gray.500">
            عرض {visibleStart} - {visibleEnd} من {effectiveTotal} حجز
          </Text>
        </Box>

        <Flex
          align="center"
          gap={isBottom ? 3 : 2}
          flexWrap="wrap"
          justify={{ base: isBottom ? "space-between" : "flex-start", md: "flex-end" }}
        >
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
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as typeof pageSize);
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

          <Flex
            align="center"
            gap={1.5}
            bg={isBottom ? "white" : "transparent"}
            border={isBottom ? "1px solid" : undefined}
            borderColor="gray.200"
            borderRadius="2xl"
            p={isBottom ? 2 : 0}
            shadow={isBottom ? "sm" : undefined}
            flexWrap="wrap"
            justify="center"
          >
            {isBottom && (
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
              >
                الأولى
              </Button>
            )}
            <Button
              size={isBottom ? "md" : "sm"}
              variant="outline"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronRight size={16} />
              السابق
            </Button>
            {pageNumbers.map((page) =>
              typeof page === "number" ? (
                <Button
                  key={page}
                  size={isBottom ? "md" : "sm"}
                  minW={isBottom ? "42px" : "34px"}
                  px={isBottom ? 3 : 2}
                  variant={page === safeCurrentPage ? "solid" : "outline"}
                  bg={page === safeCurrentPage ? "#666139" : undefined}
                  color={page === safeCurrentPage ? "white" : undefined}
                  _hover={{
                    bg: page === safeCurrentPage ? "#555230" : "gray.50",
                  }}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ) : (
                <Text key={page} px={1} color="gray.400" fontWeight="bold">
                  …
                </Text>
              ),
            )}
            <Button
              size={isBottom ? "md" : "sm"}
              variant="outline"
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              التالي
              <ChevronLeft size={16} />
            </Button>
            {isBottom && (
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                الأخيرة
              </Button>
            )}
          </Flex>
        </Flex>
      </Flex>
    );
  };

  const renderExtraBookingBadge = (booking: Booking) =>
    booking.isExtraBooking ? (
      <Badge
        colorPalette="orange"
        variant="subtle"
        fontSize="xs"
        px={2}
        py={0.5}
        rounded="full"
        fontWeight="bold"
      >
        حجز إضافي
      </Badge>
    ) : null;

  const renderBookingTimeDisplay = (booking: Booking, compact = false) => {
    const hasTime = hasBookingSpecificTime(booking);
    const label = formatBookingTime(booking);
    return (
      <Flex direction="column" align="flex-start" gap={1}>
        <Flex
          align="center"
          gap={1.5}
          bg={compact ? "white" : undefined}
          px={compact ? 3 : 0}
          py={compact ? 1 : 0}
          borderRadius={compact ? "full" : undefined}
          border={compact ? "1px solid" : undefined}
          borderColor={compact ? "gray.200" : undefined}
          flexShrink={0}
        >
          {hasTime && <Clock size={14} color="#666139" />}
          <Text
            fontSize="sm"
            fontWeight={hasTime ? "bold" : "medium"}
            color={hasTime ? "#666139" : "gray.500"}
            fontStyle={hasTime ? "normal" : "italic"}
          >
            {label}
          </Text>
        </Flex>
        {renderExtraBookingBadge(booking)}
      </Flex>
    );
  };

  const getExamCardTheme = (examinationStatus?: ExaminationStatus) => {
    if (examinationStatus === "done")
      return { border: "green.300", bg: "#ecfdf5", accent: "#16a34a" };
    if (examinationStatus === "waiting")
      return { border: "yellow.200", bg: "#fffbeb", accent: "#d97706" };
    return { border: "gray.200", bg: "white", accent: "#666139" };
  };

  const renderMobileBookingMenu = (booking: Booking) => (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          aria-label="المزيد"
          size="sm"
          variant="ghost"
          colorPalette="gray"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={18} />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <MenuItem value="edit" onClick={() => handleEditClick(booking)}>
          تعديل البيانات
        </MenuItem>
        {booking.bookingType === "online" && (
          <>
            <MenuItem
              value="pending"
              onClick={() => handleStatusChange(booking.id, "pending")}
            >
              قيد الانتظار
            </MenuItem>
            <MenuItem
              value="confirmed"
              onClick={() => handleStatusChange(booking.id, "confirmed")}
            >
              تأكيد
            </MenuItem>
            <MenuItem
              value="rejected"
              onClick={() => handleStatusChange(booking.id, "rejected")}
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
  );

  const renderMobileBookingCard = (booking: Booking, index: number) => {
    const theme = getExamCardTheme(booking.examinationStatus);
    const accent = booking.isExtraBooking ? "#ea580c" : theme.accent;
    return (
      <Box
        key={booking.id}
        borderRadius="xl"
        border="1px solid"
        borderColor={booking.isExtraBooking ? "orange.200" : theme.border}
        borderInlineStartWidth="4px"
        borderInlineStartColor={accent}
        bg={booking.isExtraBooking ? "orange.50" : theme.bg}
        shadow="sm"
        overflow="hidden"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{ shadow: "md", borderColor: "#666139" }}
        onClick={() => router.push(`/patient-history/${booking.id}`)}
      >
        {/* الصف العلوي: رقم + اسم + تواصل */}
        <Flex align="center" gap={3} px={4} pt={4} pb={3}>
          <Flex
            align="center"
            justify="center"
            minW="36px"
            h="36px"
            borderRadius="lg"
            bg="#666139"
            color="white"
            fontWeight="bold"
            fontSize="sm"
            flexShrink={0}
          >
            {index + 1}
          </Flex>
          <Avatar.Root size="md" bg="#666139" flexShrink={0}>
            <Avatar.Fallback color="white" fontWeight="bold">
              {booking.customerName?.charAt(0) || "?"}
            </Avatar.Fallback>
          </Avatar.Root>
          <Box flex={1} minW={0}>
            <Text
              fontWeight="bold"
              fontSize="md"
              color="#2d3748"
              lineClamp={2}
              lineHeight="short"
            >
              {booking.customerName}
            </Text>
          </Box>
          <Flex
            gap={1}
            flexShrink={0}
            align="center"
            onClick={(e) => e.stopPropagation()}
          >
            <WhatsAppCustomerLink
              phone={booking.customerPhone}
              stopClickPropagation
              showPhoneTooltip
              boxSize="38px"
              iconSize={20}
              pill
            />
            {renderMobileBookingMenu(booking)}
          </Flex>
        </Flex>

        {/* الوقت والحالات */}
        <Flex
          px={4}
          py={2.5}
          gap={2}
          flexWrap="wrap"
          align="center"
          bg="whiteAlpha.700"
          borderTop="1px solid"
          borderBottom="1px solid"
          borderColor="blackAlpha.50"
        >
          {renderBookingTimeDisplay(booking, true)}
          {renderExaminationCell(booking)}
          {getStatusBadge(booking.status)}
          <Badge
            variant="subtle"
            fontSize="xs"
            colorPalette={booking.bookingType === "online" ? "green" : "blue"}
          >
            {booking.bookingType === "online" ? "أونلاين" : "عيادة"}
          </Badge>
          <Badge variant="outline" fontSize="xs" colorPalette="purple">
            {getVisitTypeLabel(booking.visitType)}
          </Badge>
        </Flex>

        {/* الخدمات */}
        <Box px={4} py={3}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={2}>
            الخدمات
          </Text>
          {renderProcedureTags(booking, true)}
        </Box>

        <Box
          px={4}
          py={3}
          borderTop="1px solid"
          borderColor="gray.100"
          bg="whiteAlpha.800"
        >
          <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={2}>
            آخر إجراء
          </Text>
          {renderActionActor(booking, true)}
        </Box>

        {/* المبلغ والإجراءات */}
        <Flex
          px={4}
          py={3}
          justify="space-between"
          align="center"
          gap={3}
          borderTop="1px solid"
          borderColor="gray.100"
          bg="white"
          onClick={(e) => e.stopPropagation()}
        >
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="#666139" lineHeight="1.2">
              {formatBookingAmount(booking.amountPaid)}{" "}
              <Text as="span" fontSize="sm" fontWeight="medium" color="gray.500">
                ج.م
              </Text>
            </Text>
            <Box mt={1.5}>{renderPaymentBadges(booking)}</Box>
          </Box>
          <Button
            size="sm"
            variant="outline"
            colorPalette="blue"
            borderRadius="lg"
            px={4}
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(booking);
            }}
          >
            <Edit2 size={15} />
            تعديل
          </Button>
        </Flex>
      </Box>
    );
  };

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
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={handleExportExcel}
                loading={isExporting}
                gap={2}
              >
                <Download size={18} />
                تصدير Excel
              </Button>
              <Button
                variant="outline"
                borderColor="whiteAlpha.500"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={handleAddNoTimeClick}
                size="sm"
                gap={2}
                display={{ base: "none", sm: "inline-flex" }}
              >
                <CalendarClock size={18} />
                حجز بدون وقت
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
        <Flex justify="flex-end" mb={3} className="no-print">
          <Button
            size="sm"
            variant={showTotalIncome ? "subtle" : "outline"}
            colorPalette="green"
            gap={2}
            onClick={() => setShowTotalIncome((v) => !v)}
          >
            {showTotalIncome ? <EyeOff size={16} /> : <Eye size={16} />}
            {showTotalIncome ? "إخفاء إجمالي الدخل" : "عرض إجمالي الدخل"}
          </Button>
        </Flex>
        <SimpleGrid
          columns={{ base: 1, sm: 2, md: showTotalIncome ? 3 : 2 }}
          gap={4}
          mb={8}
        >
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
                  {effectiveTotal}
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
          {showTotalIncome && (
            <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
              <Card.Body p={5}>
                <Flex align="center" gap={4}>
                  <Box p={3} bg="#f4f3ed" borderRadius="xl">
                    <DollarSign size={24} color="#666139" />
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" fontWeight="medium">
                      {activeServerPaginated ? "دخل الصفحة المعروضة" : "إجمالي الدخل"}
                    </Text>
                    <Text fontSize="2xl" fontWeight="bold" color="#666139">
                      {formatBookingAmount(totalIncome)} EGP
                    </Text>
                  </Box>
                </Flex>
                {incomeByPaymentMethod.length > 0 && (
                  <Box mt={4} pt={3} borderTop="1px solid" borderColor="gray.100">
                    <Text fontSize="xs" color="gray.500" mb={2} fontWeight="medium">
                      تفصيل حسب طريقة الدفع
                    </Text>
                    <Flex gap={2} flexWrap="wrap">
                      {incomeByPaymentMethod.map((row) => (
                        <Badge
                          key={row.label}
                          variant="subtle"
                          bg="#f8f7ef"
                          color="#615b36"
                          border="1px solid"
                          borderColor="#e8e4d4"
                          px={2}
                          py={1}
                          rounded="lg"
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {row.label}: {formatBookingAmount(row.amount)} EGP
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Card.Body>
            </Card.Root>
          )}
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
              direction="column"
              gap={4}
              align="stretch"
            >
              <Box w="full">
                <Box position="relative" w="full">
                <Input
                  placeholder="اكتب اسم المريض أو رقم الهاتف للبحث..."
                  bg="gray.50"
                  pr={14}
                  pl={searchQuery ? 24 : 5}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="lg"
                  h={{ base: "58px", md: "64px" }}
                  fontSize={{ base: "md", md: "xl" }}
                  fontWeight="medium"
                  borderRadius="2xl"
                  border="2px solid"
                  borderColor={searchQuery ? "#b6b299" : "gray.200"}
                  _focus={{
                    borderColor: "#666139",
                    bg: "white",
                    boxShadow: "0 0 0 1px #666139",
                  }}
                />
                <Box
                  position="absolute"
                  right={5}
                  top="50%"
                  transform="translateY(-50%)"
                  color={searchQuery ? "#666139" : "gray.400"}
                  pointerEvents="none"
                >
                  <Search size={24} />
                </Box>
                {searchQuery && (
                  <Button
                    position="absolute"
                    left={3}
                    top="50%"
                    transform="translateY(-50%)"
                    size="sm"
                    variant="solid"
                    bg="#666139"
                    color="white"
                    _hover={{ bg: "#555230" }}
                    borderRadius="full"
                    onClick={() => {
                      setSearchQuery("");
                      setDebouncedSearchQuery("");
                      setCurrentPage(1);
                    }}
                  >
                    مسح
                  </Button>
                )}
                </Box>
                {liveSearchTerm && (
                  <Text fontSize="sm" color="gray.600" mt={2} px={1}>
                    البحث الحالي: {liveSearchTerm}
                    {searchTerm !== liveSearchTerm ? " (جاري التحميل...)" : ""}
                  </Text>
                )}
              </Box>

              <Flex gap={2} wrap="wrap" justify="flex-start">
                {canSelectDoctor && (
                  <Box
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    minW={{ base: "full", sm: "220px" }}
                    px={1}
                  >
                    <select
                      value={selectedDoctorId || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value) || 0;
                        setDoctorId(id);
                        setSelectedDoctorId(id || null);
                      }}
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
                      <option value="">كل الأطباء</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.user?.name || doc.name || `Doctor #${doc.id}`}
                        </option>
                      ))}
                    </select>
                  </Box>
                )}
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
                <Box
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  minW={{ base: "full", sm: "200px" }}
                  px={1}
                >
                  <select
                    value={filterPaymentMethod}
                    onChange={(e) =>
                      setFilterPaymentMethod(e.target.value as PaymentFilterValue)
                    }
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
                    <option value="all">كل طرق الدفع</option>
                    <option value="none">غير محدد</option>
                    {CLINIC_PAYMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
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
                  {(["all", "pending", "cancelled"] as const).map(
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
                            ? "انتظار الكشف"
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
            {renderPaginationControls("top")}

            {/* Mobile Cards */}
            <Box display={{ base: "block", md: "none" }} p={4}>
              {effectiveTotal === 0 ? (
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
                <SimpleGrid columns={1} gap={3}>
                  {visibleBookings.map((booking, index) =>
                    renderMobileBookingCard(
                      booking,
                      visibleStart + index - 1,
                    ),
                  )}
                </SimpleGrid>
              )}
            </Box>

            {/* Desktop Table */}
            <Box
              display={{ base: "none", md: "block" }}
              overflowX="auto"
              p={{ base: 0, md: 4 }}
            >
              <Table.Root size="sm" variant="outline" striped>
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
                      w="72px"
                      textAlign="center"
                    >
                      واتساب
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      py={4}
                      px={4}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      textTransform="uppercase"
                      minW="180px"
                    >
                      الخدمات
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
                      المبلغ / الدفع
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
                  {effectiveTotal === 0 ? (
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
                    visibleBookings.map((booking, index) => (
                      <Fragment key={booking.id}>
                        <Table.Row
                        bg={
                          booking.examinationStatus === "done"
                            ? "#dcfce7"
                            : booking.isExtraBooking
                              ? "orange.50"
                              : getRowBg(booking.examinationStatus)
                        }
                        css={{
                          "& > td": {
                            background:
                              booking.examinationStatus === "done"
                                ? "#dcfce7"
                                : booking.isExtraBooking
                                  ? "var(--chakra-colors-orange-50)"
                                  : undefined,
                          },
                        }}
                        _hover={{
                          bg: booking.examinationStatus === "done"
                            ? "#d1fae5"
                            : booking.isExtraBooking
                              ? "orange.100"
                              : booking.examinationStatus === "waiting"
                                ? "yellow.100"
                                : "gray.50",
                          "& > td": {
                            background:
                              booking.examinationStatus === "done"
                              ? "#d1fae5"
                              : booking.isExtraBooking
                                ? "var(--chakra-colors-orange-100)"
                                : undefined,
                          },
                        }}
                        cursor="pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (
                            !target.closest("button") &&
                            !target.closest("a") &&
                            !target.closest("[data-actions]")
                          ) {
                            router.push(`/patient-history/${booking.id}`);
                          }
                        }}
                        transition="background 0.15s"
                      >
                        <Table.Cell py={4} px={4} fontWeight="bold" color="#666139">
                          {visibleStart + index}
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
                        <Table.Cell py={4} px={2} textAlign="center">
                          <Flex justify="center">
                            <WhatsAppCustomerLink
                              phone={booking.customerPhone}
                              stopClickPropagation
                              showPhoneTooltip
                              boxSize="40px"
                              iconSize={21}
                              pill
                            />
                          </Flex>
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          <Box>
                            {renderProcedureTags(booking)}
                            <Flex gap={1} mt={1.5} flexWrap="wrap">
                              <Badge fontSize="xs" variant="subtle" colorScheme="blue">
                                {booking.bookingType === "online" ? "أونلاين" : "عيادة"}
                              </Badge>
                              <Badge fontSize="xs" variant="outline" colorScheme="purple">
                                {getVisitTypeLabel(booking.visitType)}
                              </Badge>
                            </Flex>
                          </Box>
                        </Table.Cell>
                        <Table.Cell
                          py={4}
                          px={4}
                          fontWeight="medium"
                          color="gray.700"
                        >
                          {renderBookingTimeDisplay(booking)}
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          <Flex direction="column" align="flex-start" gap={1}>
                            <Text fontWeight="bold" color="#666139">
                              {formatBookingAmount(booking.amountPaid)} EGP
                            </Text>
                            {renderPaymentBadges(booking)}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell py={4} px={4}>
                          {renderExaminationCell(booking)}
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
                          <Flex gap={2} align="center">
                            <Button
                              size="xs"
                              variant={
                                expandedActionBookingId === booking.id
                                  ? "solid"
                                  : "outline"
                              }
                              bg={
                                expandedActionBookingId === booking.id
                                  ? "#666139"
                                  : undefined
                              }
                              color={
                                expandedActionBookingId === booking.id
                                  ? "white"
                                  : undefined
                              }
                              disabled={!getLatestAction(booking)}
                              onClick={() =>
                                setExpandedActionBookingId((current) =>
                                  current === booking.id ? null : booking.id,
                                )
                              }
                            >
                              <CheckCircle size={14} />
                              الإجراء
                            </Button>
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
                        {expandedActionBookingId === booking.id && (
                          <Table.Row>
                            <Table.Cell colSpan={9} p={4} bg="#f8fafc">
                              <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                                {renderBookingActionDetails(booking)}
                                {renderPaymentDetailsPanel(booking)}
                              </SimpleGrid>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Fragment>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
            {renderPaginationControls("bottom")}
          </Card.Root>
        )}

        {/* Print Summary */}
        <Box
          display="none"
          css={{ "@media print": { display: "block", marginTop: "2rem" } }}
        >
          <Flex justify="space-between" borderTop="1px dashed gray" pt={4}>
            <Text>إجمالي الحجوزات: {effectiveTotal}</Text>
            <Text fontWeight="bold">
              إجمالي الدخل: {totalIncome.toFixed(2)} EGP
            </Text>
          </Flex>
        </Box>
      </Container>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalDefaultNoTime(false);
        }}
        onSave={handleSaveBooking}
        initialData={editingBooking}
        doctorId={selectedDoctorId || getCurrentDoctorId()}
        defaultDate={rangeStart}
        defaultNoTime={modalDefaultNoTime}
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
