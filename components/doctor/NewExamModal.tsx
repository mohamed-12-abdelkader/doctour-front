import {
    Dialog,
    Button, Field, Input, Textarea, VStack, HStack, Text, Box
} from '@chakra-ui/react'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Medicine } from '@/types/doctor'

interface NewExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { diagnosis: string; notes: string; medicines: Medicine[] }) => void;
    patientName: string;
}

export default function NewExamModal({ isOpen, onClose, onSave, patientName }: NewExamModalProps) {
    const [diagnosis, setDiagnosis] = useState('')
    const [notes, setNotes] = useState('')
    const [medicines, setMedicines] = useState<Medicine[]>([])

    // Temporary state for new medicine input
    const [newMed, setNewMed] = useState({ name: '', dosage: '', duration: '' })

    const handleAddMedicine = () => {
        if (!newMed.name) return;
        const medicine: Medicine = {
            id: Math.random().toString(36).substr(2, 9),
            ...newMed
        }
        setMedicines([...medicines, medicine])
        setNewMed({ name: '', dosage: '', duration: '' })
    }

    const handleRemoveMedicine = (id: string) => {
        setMedicines(medicines.filter(m => m.id !== id))
    }

    const handleSave = () => {
        onSave({ diagnosis, notes, medicines })
        // Reset and close
        setDiagnosis('')
        setNotes('')
        setMedicines([])
        onClose()
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl" scrollBehavior="inside">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content dir="rtl" fontFamily="var(--font-tajawal)">
                    <Dialog.CloseTrigger />
                    <Dialog.Header>كشف جديد: {patientName}</Dialog.Header>
                    <Dialog.Body>
                        <VStack gap={4} align="stretch">
                            <Field.Root required>
                                <Field.Label>التشخيص (Diagnosis)</Field.Label>
                                <Textarea
                                    placeholder="اكتب التشخيص هنا..."
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    minH="100px"
                                />
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>ملاحظات إضافية</Field.Label>
                                <Input
                                    placeholder="أي ملاحظات أخرى..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </Field.Root>

                            <Box borderTop="1px solid" borderColor="gray.100" pt={4}>
                                <Text fontWeight="bold" mb={3}>الروشتة (الأدوية)</Text>

                                {/* Add Medicine Form */}
                                <HStack align="end" mb={4}>
                                    <Field.Root flex={2}>
                                        <Field.Label fontSize="sm">اسم الدواء</Field.Label>
                                        <Input
                                            size="sm"
                                            value={newMed.name}
                                            onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                                            placeholder="Panadol"
                                        />
                                    </Field.Root>
                                    <Field.Root flex={1}>
                                        <Field.Label fontSize="sm">الجرعة</Field.Label>
                                        <Input
                                            size="sm"
                                            value={newMed.dosage}
                                            onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                                            placeholder="1 tab / 8h"
                                        />
                                    </Field.Root>
                                    <Field.Root flex={1}>
                                        <Field.Label fontSize="sm">المدة</Field.Label>
                                        <Input
                                            size="sm"
                                            value={newMed.duration}
                                            onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                                            placeholder="5 days"
                                        />
                                    </Field.Root>
                                    <Button
                                        aria-label="Add Medicine"
                                        size="sm"
                                        colorPalette="teal"
                                        onClick={handleAddMedicine}
                                    >
                                        <Plus size={18} />
                                    </Button>
                                </HStack>

                                {/* Medicines List */}
                                {medicines.length > 0 && (
                                    <VStack align="stretch" bg="gray.50" p={2} rounded="md" gap={2}>
                                        {medicines.map((med, index) => (
                                            <HStack key={med.id} justify="space-between" bg="white" p={2} rounded="sm" shadow="sm">
                                                <HStack>
                                                    <Text fontWeight="bold" fontSize="sm">{index + 1}. {med.name}</Text>
                                                    <Text fontSize="xs" color="gray.500">({med.dosage} - {med.duration})</Text>
                                                </HStack>
                                                <Button
                                                    aria-label="Delete"
                                                    size="xs"
                                                    colorPalette="red"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveMedicine(med.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </HStack>
                                        ))}
                                    </VStack>
                                )}
                            </Box>
                        </VStack>
                    </Dialog.Body>

                    <Dialog.Footer gap={3}>
                        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
                        <Button colorPalette="blue" onClick={handleSave} disabled={!diagnosis}>
                            حفظ الكشف والروشتة
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
