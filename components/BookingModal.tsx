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
import { useState, useEffect } from "react";
import { Booking } from "@/types/booking";
import api from "@/lib/axios";
import { BOOKING_SERVICES } from "@/data/services";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: any) => void;
  initialData?: Booking | null;
}

export default function BookingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [visitType, setVisitType] = useState<string>(BOOKING_SERVICES[0] ?? "");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

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

        const timeString = initialData.appointmentDate || "";

        if (timeString && timeString.includes("T")) {
          const d = new Date(timeString);
          setDate(d.toISOString().split("T")[0]);
          setTime(
            d.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
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
      }
    }
  }, [isOpen, initialData]);

  // Fetch available slots when date changes (or modal opens)
  useEffect(() => {
    const fetchSlots = async () => {
      if (!isOpen || !date) {
        setAvailableSlots([]);
        return;
      }
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      try {
        const res = await api.get("/bookings/available-slots", {
          params: { date },
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
  }, [isOpen, date]);

  const handleSave = () => {
    if (!name || !date || !phone) {
      alert("يرجى ملء جميع الحقول المطلوبة");
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
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    اسم العميل
                  </Text>
                  <Input
                    placeholder="الاسم ثلاثي"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    bg="gray.50"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#615b36", bg: "white" }}
                    minH={{ base: "44px", sm: "40px" }}
                  />
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
                              {slot}
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
