import {
    Dialog, Button, Field, Input, Select, VStack, HStack, Textarea
} from '@chakra-ui/react'
import { useState } from 'react'
import { Transaction, TransactionType, TransactionCategory, PaymentMethod } from '@/types/accounts'

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
}

export default function AddTransactionModal({ isOpen, onClose, onSave }: AddTransactionModalProps) {
    const [type, setType] = useState<TransactionType>('income')
    const [category, setCategory] = useState<TransactionCategory>('consultation')
    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
    const [clientName, setClientName] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')

    const handleSave = () => {
        if (!amount || (type === 'income' && !clientName)) return;

        onSave({
            type,
            category,
            amount: parseFloat(amount),
            paymentMethod,
            clientName: clientName || undefined,
            phoneNumber: phone || undefined,
            notes: notes || undefined
        })
        handleClose()
    }

    const handleClose = () => {
        // Reset form
        setType('income')
        setAmount('')
        setClientName('')
        setPhone('')
        setNotes('')
        onClose()
    }

    // Categories based on type
    const incomeCategories: { label: string; value: TransactionCategory }[] = [
        { label: 'كشف', value: 'consultation' },
        { label: 'جلسة / خدمة', value: 'service' },
        { label: 'إجراء طبي', value: 'procedure' },
    ]

    const expenseCategories: { label: string; value: TransactionCategory }[] = [
        { label: 'إيجار', value: 'rent' },
        { label: 'رواتب', value: 'salary' },
        { label: 'معدات وأدوات', value: 'equipment' },
        { label: 'فواتير (كهرباء/نت)', value: 'utilities' },
        { label: 'نثريات / أخرى', value: 'other' },
    ]

    const currentCategories = type === 'income' ? incomeCategories : expenseCategories;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size="lg">
            <Dialog.Backdrop backdropFilter="blur(4px)" />
            <Dialog.Positioner>
                <Dialog.Content dir="rtl" fontFamily="var(--font-tajawal)">
                    <Dialog.CloseTrigger />
                    <Dialog.Header fontSize="lg" fontWeight="bold">إضافة عملية جديدة</Dialog.Header>
                    <Dialog.Body>
                        <VStack gap={4} align="stretch">

                            {/* Transaction Type */}
                            <HStack w="full" bg="gray.50" p={1} rounded="lg">
                                <Button
                                    flex={1}
                                    variant={type === 'income' ? 'solid' : 'ghost'}
                                    colorPalette={type === 'income' ? 'green' : 'gray'}
                                    onClick={() => { setType('income'); setCategory('consultation'); }}
                                >
                                    دخل (Income)
                                </Button>
                                <Button
                                    flex={1}
                                    variant={type === 'expense' ? 'solid' : 'ghost'}
                                    colorPalette={type === 'expense' ? 'red' : 'gray'}
                                    onClick={() => { setType('expense'); setCategory('rent'); }}
                                >
                                    مصروف (Expense)
                                </Button>
                            </HStack>

                            {/* Client Info (Only required for Income, optional/hidden for Expense based on needs) */}
                            {type === 'income' && (
                                <HStack>
                                    <Field.Root flex={2} required>
                                        <Field.Label>اسم العميل / المريض</Field.Label>
                                        <Input
                                            placeholder="احمد محمد"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                        />
                                    </Field.Root>
                                    <Field.Root flex={1}>
                                        <Field.Label>رقم الهاتف (اختياري)</Field.Label>
                                        <Input
                                            placeholder="010..."
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </Field.Root>
                                </HStack>
                            )}
                            {type === 'expense' && (
                                <Field.Root>
                                    <Field.Label>وصف المصروف (اختياري)</Field.Label>
                                    <Input
                                        placeholder="مثال: فاتورة كهرباء شهر 1"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                    />
                                </Field.Root>
                            )}

                            <HStack align="start">
                                {/* Amount */}
                                <Field.Root flex={1} required>
                                    <Field.Label>المبلغ (EGP)</Field.Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </Field.Root>

                                {/* Category */}
                                <Field.Root flex={1}>
                                    <Field.Label>التصنيف</Field.Label>
                                    <Select.Root
                                        value={[category]}
                                        onValueChange={(e) => setCategory(e.value[0] as TransactionCategory)}
                                        collection={{ items: currentCategories, itemToString: (item) => item.label, itemToValue: (item) => item.value }}
                                    >
                                        <Select.Trigger>
                                            <Select.ValueText placeholder="اختر التصنيف" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {currentCategories.map(cat => (
                                                <Select.Item key={cat.value} item={cat}>
                                                    {cat.label}
                                                </Select.Item>
                                            ))}
                                        </Select.Content>
                                    </Select.Root>
                                </Field.Root>
                            </HStack>

                            {/* Payment Method */}
                            <Field.Root>
                                <Field.Label>طريقة الدفع</Field.Label>
                                <HStack gap={4}>
                                    {(['cash', 'visa', 'transfer'] as PaymentMethod[]).map(method => (
                                        <Button
                                            key={method}
                                            size="sm"
                                            variant={paymentMethod === method ? 'outline' : 'ghost'}
                                            borderColor={paymentMethod === method ? 'blue.500' : 'transparent'}
                                            bg={paymentMethod === method ? 'blue.50' : 'transparent'}
                                            onClick={() => setPaymentMethod(method)}
                                        >
                                            {method === 'cash' ? 'كاش (Cash)' : method === 'visa' ? 'فيزا (Visa)' : 'تحويل (Transfer)'}
                                        </Button>
                                    ))}
                                </HStack>
                            </Field.Root>

                            {/* Notes */}
                            <Field.Root>
                                <Field.Label>ملاحظات</Field.Label>
                                <Textarea
                                    placeholder="أي تفاصيل إضافية..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </Field.Root>

                        </VStack>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Button variant="ghost" onClick={handleClose}>إلغاء</Button>
                        <Button onClick={handleSave} colorPalette="blue" disabled={!amount || (type === 'income' && !clientName)}>
                            حفظ العملية
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}
