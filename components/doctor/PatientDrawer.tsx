import {
    Drawer,
    Tabs,
    Box, Text, VStack, HStack, Badge, Button, Input, useDisclosure,
    Separator
} from '@chakra-ui/react'
import { Patient, Appointment } from '@/types/doctor'
import { FileText, Activity, Pill, Plus, AlertCircle } from 'lucide-react'
import NewExamModal from './NewExamModal'

interface PatientDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient | null;
    currentAppointment?: Appointment;
    onAddExamination: (patientId: string, data: any) => void;
}

export default function PatientDrawer({ isOpen, onClose, patient, currentAppointment, onAddExamination }: PatientDrawerProps) {
    const { open: isExamOpen, onOpen: onExamOpen, onClose: onExamClose } = useDisclosure()

    if (!patient) return null

    const handleSaveExam = (data: any) => {
        onAddExamination(patient.id, data)
        onExamClose()
    }

    return (
        <>
            <Drawer.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="start" size="lg">
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content dir="rtl" fontFamily="var(--font-tajawal)">
                        <Drawer.CloseTrigger />
                        <Drawer.Header borderBottomWidth="1px">
                            <VStack align="start" gap={1}>
                                <Text fontSize="xl">{patient.name}</Text>
                                <HStack fontSize="sm" color="gray.500">
                                    <Text>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</Text>
                                    <Text>•</Text>
                                    <Text>{patient.age} سنة</Text>
                                    <Text>•</Text>
                                    <Text>{patient.phone}</Text>
                                </HStack>
                                {/* Warnings */}
                                {(patient.chronicDiseases?.length || 0) > 0 && (
                                    <HStack wrap="wrap" mt={1}>
                                        {patient.chronicDiseases?.map(d => (
                                            <Badge key={d} colorPalette="orange" variant="solid">{d}</Badge>
                                        ))}
                                    </HStack>
                                )}
                                {(patient.allergies?.length || 0) > 0 && (
                                    <HStack wrap="wrap" mt={1}>
                                        <Badge colorPalette="red" variant="solid" display="flex" alignItems="center" gap={1}>
                                            <AlertCircle size={12} />
                                            حساسية: {patient.allergies?.join(', ')}
                                        </Badge>
                                    </HStack>
                                )}
                            </VStack>
                        </Drawer.Header>

                        <Drawer.Body p={0}>
                            <Tabs.Root defaultValue="summary" colorPalette="blue" h="full" display="flex" flexDirection="column">
                                <Tabs.List>
                                    <Tabs.Trigger value="summary" gap={2}><Activity size={18} /> ملخص الحالة</Tabs.Trigger>
                                    <Tabs.Trigger value="history" gap={2}><FileText size={18} /> السجل الطبي</Tabs.Trigger>
                                    <Tabs.Trigger value="media" gap={2}><Pill size={18} /> الروشتات</Tabs.Trigger>
                                </Tabs.List>

                                <Tabs.Content value="summary" flex={1} bg="gray.50" overflowY="auto" p={4}>
                                    <VStack gap={4} align="stretch">
                                        <Box bg="white" p={4} rounded="md" shadow="sm">
                                            <Text fontWeight="bold" mb={2} color="blue.600">الزيارة الحالية</Text>
                                            {currentAppointment ? (
                                                <VStack align="start" gap={2}>
                                                    <HStack justify="space-between" w="full">
                                                        <Text fontSize="sm" color="gray.500">وقت الحجز:</Text>
                                                        <Text fontWeight="medium">{currentAppointment.time}</Text>
                                                    </HStack>
                                                    <HStack justify="space-between" w="full">
                                                        <Text fontSize="sm" color="gray.500">النوع:</Text>
                                                        <Badge>{currentAppointment.type === 'online' ? 'أونلاين' : 'عيادة'}</Badge>
                                                    </HStack>
                                                    <HStack justify="space-between" w="full">
                                                        <Text fontSize="sm" color="gray.500">الشكوى:</Text>
                                                        <Text>{currentAppointment.reason || 'غير محدد'}</Text>
                                                    </HStack>
                                                </VStack>
                                            ) : (
                                                <Text color="gray.500">لا يوجد موعد حالي محدد</Text>
                                            )}
                                        </Box>

                                        <Button
                                            colorPalette="blue"
                                            size="lg"
                                            w="full"
                                            onClick={onExamOpen}
                                        >
                                            <Plus size={18} style={{ marginInlineEnd: '8px' }} />
                                            تسجيل كشف جديد
                                        </Button>

                                        <Box bg="white" p={4} rounded="md" shadow="sm">
                                            <Text fontWeight="bold" mb={2}>ملاحظات المريض</Text>
                                            <Text fontSize="sm" color="gray.600">{patient.notes || 'لا توجد ملاحظات مسجلة'}</Text>
                                        </Box>
                                    </VStack>
                                </Tabs.Content>

                                {/* History Tab */}
                                <Tabs.Content value="history" flex={1} bg="gray.50" overflowY="auto" p={4}>
                                    <VStack gap={4} align="stretch">
                                        {patient.examinations.length === 0 ? (
                                            <Text textAlign="center" color="gray.500" py={10}>لا يوجد سجل كشوفات سابق</Text>
                                        ) : (
                                            patient.examinations.map((exam) => (
                                                <Box key={exam.id} bg="white" p={4} rounded="md" shadow="sm" borderRight="4px solid" borderColor="blue.400">
                                                    <HStack justify="space-between" mb={2}>
                                                        <Text fontWeight="bold" fontSize="lg">{exam.diagnosis}</Text>
                                                        <Text fontSize="xs" color="gray.500">{new Date(exam.date).toLocaleDateString('ar-EG')}</Text>
                                                    </HStack>
                                                    {exam.notes && (
                                                        <Text fontSize="sm" color="gray.600" mt={2} bg="gray.50" p={2} rounded="sm">
                                                            {exam.notes}
                                                        </Text>
                                                    )}
                                                </Box>
                                            ))
                                        )}
                                    </VStack>
                                </Tabs.Content>

                                {/* Prescriptions Tab */}
                                <Tabs.Content value="media" flex={1} bg="gray.50" overflowY="auto" p={4}>
                                    <VStack gap={4} align="stretch">
                                        {patient.prescriptions.length === 0 ? (
                                            <Text textAlign="center" color="gray.500" py={10}>لا توجد روشتات مسجلة</Text>
                                        ) : (
                                            patient.prescriptions.map((presc) => (
                                                <Box key={presc.id} bg="white" p={4} rounded="md" shadow="sm">
                                                    <HStack justify="space-between" mb={3} borderBottom="1px dashed" borderColor="gray.200" pb={2}>
                                                        <HStack color="blue.600">
                                                            <Pill size={16} />
                                                            <Text fontWeight="bold">روشتة {new Date(presc.date).toLocaleDateString('ar-EG')}</Text>
                                                        </HStack>
                                                        <Button size="xs" variant="outline">طباعة</Button>
                                                    </HStack>
                                                    <VStack align="stretch" gap={2}>
                                                        {presc.medicines.map((med, idx) => (
                                                            <HStack key={idx} justify="space-between" fontSize="sm">
                                                                <Text fontWeight="medium">• {med.name}</Text>
                                                                <Text color="gray.500">{med.dosage} لمدة {med.duration}</Text>
                                                            </HStack>
                                                        ))}
                                                    </VStack>
                                                </Box>
                                            ))
                                        )}
                                    </VStack>
                                </Tabs.Content>
                            </Tabs.Root>
                        </Drawer.Body>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Drawer.Root>

            <NewExamModal
                isOpen={isExamOpen}
                onClose={onExamClose}
                onSave={handleSaveExam}
                patientName={patient.name}
            />
        </>
    )
}
