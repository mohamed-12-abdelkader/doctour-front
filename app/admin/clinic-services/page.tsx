"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Badge,
  IconButton,
  Table,
  Spinner,
  Card,
  Dialog,
  Field,
  Input,
  Stack,
  Switch,
} from "@chakra-ui/react";
import {
  Plus,
  Edit2,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Layers,
  RefreshCw,
  Power,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { getIsFullAdmin } from "@/lib/admin-nav";
import type {
  ClinicService,
  CreateClinicServicePayload,
  UpdateClinicServicePayload,
} from "@/types/clinic-service";

function normalizeServicesList(data: unknown): ClinicService[] {
  if (Array.isArray(data)) return data as ClinicService[];
  if (
    data &&
    typeof data === "object" &&
    "services" in data &&
    Array.isArray((data as { services: unknown }).services)
  ) {
    return (data as { services: ClinicService[] }).services;
  }
  return [];
}

type FormState = {
  name: string;
  treatAsFollowup: boolean;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  treatAsFollowup: false,
  sortOrder: "0",
  isActive: true,
};

export default function ClinicServicesAdminPage() {
  const router = useRouter();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [legacyVisitTypes, setLegacyVisitTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClinicService | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showInactive, setShowInactive] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  const [notification, setNotification] = useState<{
    status: "success" | "error" | "info" | "warning";
    title: string;
    description?: string;
  } | null>(null);

  const showNotification = (
    status: "success" | "error" | "info" | "warning",
    title: string,
    description?: string,
  ) => {
    setNotification({ status, title, description });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getIsFullAdmin()) {
      showNotification(
        "warning",
        "صلاحية غير كافية",
        "إدارة الخدمات متاحة للسوبر أدمن فقط.",
      );
      router.replace("/admin/dashboard");
      return;
    }
    setAccessChecked(true);
  }, [router]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/clinic-services/admin/all");
      const list = normalizeServicesList(res.data);
      setServices(
        [...list].sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.name.localeCompare(b.name, "ar"),
        ),
      );
      const legacy = res.data?.legacyVisitTypes;
      if (Array.isArray(legacy)) setLegacyVisitTypes(legacy);
    } catch {
      showNotification("error", "خطأ في جلب البيانات", "تعذر تحميل قائمة الخدمات.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessChecked) return;
    fetchServices();
  }, [accessChecked]);

  const displayedServices = useMemo(() => {
    if (showInactive) return services;
    return services.filter((s) => s.isActive);
  }, [services, showInactive]);

  const activeCount = useMemo(
    () => services.filter((s) => s.isActive).length,
    [services],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingService(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    const maxOrder = services.reduce(
      (m, s) => Math.max(m, s.sortOrder ?? 0),
      0,
    );
    setForm({ ...emptyForm, sortOrder: String(maxOrder + 1) });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (service: ClinicService) => {
    setEditingService(service);
    setForm({
      name: service.name,
      treatAsFollowup: service.treatAsFollowup,
      sortOrder: String(service.sortOrder ?? 0),
      isActive: service.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const parseSortOrder = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async () => {
    const nameTrim = form.name.trim();
    if (!nameTrim) {
      showNotification("warning", "أدخل اسم الخدمة");
      return;
    }
    const sortOrder = parseSortOrder(form.sortOrder);

    setIsSubmitting(true);
    try {
      if (editingService) {
        const payload: UpdateClinicServicePayload = {
          name: nameTrim,
          treatAsFollowup: form.treatAsFollowup,
          isActive: form.isActive,
        };
        if (sortOrder !== undefined) payload.sortOrder = sortOrder;
        await api.put(
          `/clinic-services/admin/${editingService.id}`,
          payload,
        );
        showNotification("success", "تم تحديث الخدمة بنجاح");
      } else {
        const payload: CreateClinicServicePayload = {
          name: nameTrim,
          treatAsFollowup: form.treatAsFollowup,
        };
        if (sortOrder !== undefined) payload.sortOrder = sortOrder;
        await api.post("/clinic-services/admin", payload);
        showNotification("success", "تمت إضافة الخدمة بنجاح");
      }
      handleCloseDialog();
      fetchServices();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "فشلت العملية";
      showNotification(
        "error",
        typeof msg === "string" ? msg : "فشلت العملية",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (service: ClinicService) => {
    if (
      !confirm(
        `تعطيل «${service.name}»؟\nلن تظهر في حجوزات جديدة. الحجوزات القديمة تبقى كما هي.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/clinic-services/admin/${service.id}`);
      showNotification("success", "تم تعطيل الخدمة");
      fetchServices();
    } catch {
      showNotification("error", "فشل تعطيل الخدمة");
    }
  };

  const handleReactivate = async (service: ClinicService) => {
    try {
      await api.put(`/clinic-services/admin/${service.id}`, {
        isActive: true,
      });
      showNotification("success", "تم تفعيل الخدمة");
      fetchServices();
    } catch {
      showNotification("error", "فشل تفعيل الخدمة");
    }
  };

  const notifBg =
    notification?.status === "success"
      ? "green.50"
      : notification?.status === "error"
        ? "red.50"
        : notification?.status === "warning"
          ? "orange.50"
          : "blue.50";
  const notifBorder =
    notification?.status === "success"
      ? "green.200"
      : notification?.status === "error"
        ? "red.200"
        : notification?.status === "warning"
          ? "orange.200"
          : "blue.200";
  const NotifIcon =
    notification?.status === "success"
      ? CheckCircle
      : notification?.status === "error"
        ? XCircle
        : notification?.status === "warning"
          ? AlertTriangle
          : Info;

  if (!accessChecked) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="#f0f1f3">
        <Spinner size="xl" color="#615b36" />
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="#f0f1f3" dir="rtl">
      <Box
        bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)"
        py={8}
        px={4}
      >
        <Container maxW="7xl">
          <Flex
            justify="space-between"
            align="center"
            flexWrap="wrap"
            gap={4}
          >
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
                  إدارة خدمات العيادة
                </Heading>
                <Text color="whiteAlpha.900" fontSize="sm" mt={1}>
                  إضافة وتعديل وتعطيل الخدمات المستخدمة في الحجز والواجهة
                </Text>
              </Box>
            </Flex>
            <Flex gap={2} flexWrap="wrap">
              <Button
                variant="outline"
                color="white"
                borderColor="whiteAlpha.400"
                _hover={{ bg: "whiteAlpha.200" }}
                size="sm"
                gap={2}
                onClick={fetchServices}
                disabled={isLoading}
              >
                <RefreshCw size={16} />
                تحديث
              </Button>
              <Button
                bg="white"
                color="#615b36"
                _hover={{ bg: "whiteAlpha.900" }}
                onClick={handleOpenCreate}
                size="sm"
                gap={2}
              >
                <Plus size={18} />
                إضافة خدمة
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={8} mt={-6} position="relative" zIndex={1}>
        {notification && (
          <Card.Root
            mb={6}
            bg={notifBg}
            border="1px solid"
            borderColor={notifBorder}
            borderRadius="xl"
          >
            <Card.Body py={4} px={5}>
              <Flex gap={3} align="start">
                <Box
                  color={
                    notification.status === "success"
                      ? "green.600"
                      : notification.status === "error"
                        ? "red.600"
                        : notification.status === "warning"
                          ? "orange.600"
                          : "blue.600"
                  }
                  mt={0.5}
                >
                  <NotifIcon size={22} />
                </Box>
                <Box flex={1}>
                  <Text fontWeight="bold" color="gray.800">
                    {notification.title}
                  </Text>
                  {notification.description && (
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      {notification.description}
                    </Text>
                  )}
                </Box>
                <IconButton
                  aria-label="إغلاق"
                  size="sm"
                  variant="ghost"
                  onClick={() => setNotification(null)}
                >
                  <X size={18} />
                </IconButton>
              </Flex>
            </Card.Body>
          </Card.Root>
        )}

        <Card.Root mb={6} bg="white" shadow="md" borderRadius="xl">
          <Card.Body py={5} px={6}>
            <Flex
              align="center"
              justify="space-between"
              flexWrap="wrap"
              gap={4}
            >
              <Flex align="center" gap={4}>
                <Box p={3} bg="#fdfbf7" borderRadius="xl">
                  <Layers size={28} color="#615b36" />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" fontWeight="medium">
                    الخدمات النشطة
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="#615b36">
                    {activeCount} / {services.length}
                  </Text>
                </Box>
              </Flex>
              <Flex align="center" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  عرض المعطّلة
                </Text>
                <Switch.Root
                  checked={showInactive}
                  onCheckedChange={(e) =>
                    setShowInactive(!!e.checked)
                  }
                  colorPalette="green"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Flex>
            </Flex>
            {legacyVisitTypes.length > 0 && (
              <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.100">
                <Text fontSize="xs" color="gray.500" mb={2}>
                  أنواع زيارة قديمة (للتوافق مع الحجوزات السابقة)
                </Text>
                <Flex gap={2} flexWrap="wrap">
                  {legacyVisitTypes.map((t) => (
                    <Badge key={t} variant="subtle" colorPalette="gray">
                      {t}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            )}
          </Card.Body>
        </Card.Root>

        <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
          {isLoading ? (
            <Flex justify="center" align="center" minH="320px">
              <Spinner size="xl" color="#615b36" />
            </Flex>
          ) : displayedServices.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              minH="280px"
              gap={3}
              p={8}
            >
              <Text color="gray.500">لا توجد خدمات لعرضها</Text>
              <Button
                colorPalette="green"
                onClick={handleOpenCreate}
                gap={2}
              >
                <Plus size={18} />
                إضافة أول خدمة
              </Button>
            </Flex>
          ) : (
            <Box overflowX="auto">
              <Table.Root size="md" variant="line">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    <Table.ColumnHeader textAlign="center" w="60px">
                      #
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>اسم الخدمة</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">
                      ترتيب
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">
                      متابعة
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">
                      الحالة
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center" w="140px">
                      إجراءات
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {displayedServices.map((service, idx) => (
                    <Table.Row
                      key={service.id}
                      opacity={service.isActive ? 1 : 0.65}
                    >
                      <Table.Cell textAlign="center" color="gray.500">
                        {idx + 1}
                      </Table.Cell>
                      <Table.Cell fontWeight="medium">
                        {service.name}
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        {service.sortOrder}
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        {service.treatAsFollowup ? (
                          <Badge colorPalette="orange" variant="subtle">
                            إعادة/متابعة
                          </Badge>
                        ) : (
                          <Text fontSize="sm" color="gray.400">
                            —
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        {service.isActive ? (
                          <Badge colorPalette="green" variant="subtle">
                            نشطة
                          </Badge>
                        ) : (
                          <Badge colorPalette="red" variant="subtle">
                            معطّلة
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Flex justify="center" gap={1}>
                          <IconButton
                            aria-label="تعديل"
                            size="sm"
                            variant="ghost"
                            colorPalette="blue"
                            onClick={() => handleOpenEdit(service)}
                          >
                            <Edit2 size={18} />
                          </IconButton>
                          {service.isActive ? (
                            <IconButton
                              aria-label="تعطيل"
                              size="sm"
                              variant="ghost"
                              colorPalette="orange"
                              onClick={() => handleDeactivate(service)}
                            >
                              <Power size={18} />
                            </IconButton>
                          ) : (
                            <IconButton
                              aria-label="تفعيل"
                              size="sm"
                              variant="ghost"
                              colorPalette="green"
                              onClick={() => handleReactivate(service)}
                            >
                              <CheckCircle size={18} />
                            </IconButton>
                          )}
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Card.Root>

        <Box mt={6} p={4} bg="blue.50" borderRadius="xl" borderWidth="1px" borderColor="blue.100">
          <Text fontSize="sm" color="blue.900" fontWeight="medium" mb={1}>
            استخدام في الحجز الجديد
          </Text>
          <Text fontSize="sm" color="blue.800" lineHeight="tall">
            بعد إضافة خدمة نشطة، تُرسل في{" "}
            <Text as="span" fontFamily="mono" fontSize="xs">
              procedureTypes
            </Text>{" "}
            عند إنشاء حجز عيادة — مثال:{" "}
            <Text as="span" dir="ltr" fontFamily="mono" fontSize="xs">
              [&quot;ليزر فراكشنال&quot;, &quot;كشف&quot;]
            </Text>
          </Text>
        </Box>
      </Container>

      <Dialog.Root
        open={isDialogOpen}
        onOpenChange={(e) => !e.open && handleCloseDialog()}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" borderRadius="2xl" mx={4}>
            <Dialog.Header>
              <Dialog.Title>
                {editingService ? "تعديل خدمة" : "إضافة خدمة جديدة"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label>اسم الخدمة</Field.Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="مثال: ليزر فراكشنال"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>ترتيب العرض</Field.Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sortOrder: e.target.value }))
                    }
                    placeholder="0"
                  />
                  <Field.HelperText>
                    رقم أصغر = يظهر أولاً في القوائم
                  </Field.HelperText>
                </Field.Root>

                <Flex
                  align="center"
                  justify="space-between"
                  p={3}
                  bg="gray.50"
                  borderRadius="lg"
                >
                  <Box>
                    <Text fontWeight="medium" fontSize="sm">
                      تُعامل كإعادة/متابعة
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      تُحوَّل في visitType كمتابعة عند الحجز
                    </Text>
                  </Box>
                  <Switch.Root
                    checked={form.treatAsFollowup}
                    onCheckedChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        treatAsFollowup: !!e.checked,
                      }))
                    }
                    colorPalette="orange"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </Flex>

                {editingService && (
                  <Flex
                    align="center"
                    justify="space-between"
                    p={3}
                    bg={form.isActive ? "green.50" : "red.50"}
                    borderRadius="lg"
                  >
                    <Box>
                      <Text fontWeight="medium" fontSize="sm">
                        الخدمة نشطة
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        المعطّلة لا تظهر في حجوزات جديدة
                      </Text>
                    </Box>
                    <Switch.Root
                      checked={form.isActive}
                      onCheckedChange={(e) =>
                        setForm((f) => ({ ...f, isActive: !!e.checked }))
                      }
                      colorPalette="green"
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </Flex>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button variant="outline" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button
                colorPalette="green"
                onClick={handleSubmit}
                loading={isSubmitting}
              >
                {editingService ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
