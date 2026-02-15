import {
    Table, Badge, Text, Box, IconButton, Flex, Avatar
} from '@chakra-ui/react'
import { Transaction } from '@/types/accounts'
import { MoreVertical, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface AccountsTableProps {
    transactions: Transaction[]
}

export default function AccountsTable({ transactions }: AccountsTableProps) {
    if (transactions.length === 0) {
        return (
            <Box textAlign="center" py={10} bg="white" rounded="xl" shadow="sm">
                <Text color="gray.500">لا توجد معاملات مسجلة</Text>
            </Box>
        )
    }

    const getTransactionIcon = (type: string) => {
        return type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />
    }

    return (
        <Box bg="white" rounded="2xl" shadow="sm" overflow="hidden">
            <Table.Root>
                <Table.Header bg="gray.50">
                    <Table.Row>
                        <Table.ColumnHeader textAlign="right">العملية / العميل</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">التصنيف</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">المبلغ</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">التاريخ</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">طريقة الدفع</Table.ColumnHeader>
                        <Table.ColumnHeader />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {transactions.map((t) => (
                        <Table.Row key={t.id} _hover={{ bg: "gray.50" }}>
                            <Table.Cell>
                                <Flex align="center" gap={3}>
                                    <Box
                                        bg={t.type === 'income' ? 'green.100' : 'red.100'}
                                        p={2}
                                        rounded="full"
                                        color={t.type === 'income' ? 'green.600' : 'red.600'}
                                    >
                                        {getTransactionIcon(t.type)}
                                    </Box>
                                    <Box>
                                        <Text fontWeight="bold">
                                            {t.clientName || t.description || (t.type === 'income' ? 'دخل عام' : 'مصروف')}
                                        </Text>
                                        {t.phoneNumber && <Text fontSize="xs" color="gray.500">{t.phoneNumber}</Text>}
                                    </Box>
                                </Flex>
                            </Table.Cell>
                            <Table.Cell>
                                <Badge colorPalette="gray" variant="surface">
                                    {t.category}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell fontWeight="bold" color={t.type === 'income' ? 'green.600' : 'red.600'}>
                                {t.type === 'income' ? '+' : '-'} {t.amount} EGP
                            </Table.Cell>
                            <Table.Cell color="gray.600" fontSize="sm">
                                {new Date(t.date).toLocaleDateString('ar-EG')}
                            </Table.Cell>
                            <Table.Cell>
                                <Badge variant="outline" colorPalette="blue">
                                    {t.paymentMethod === 'visa' ? 'Visa' : t.paymentMethod === 'cash' ? 'Cash' : 'Transfer'}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell>
                                <IconButton aria-label="More" size="xs" variant="ghost" colorPalette="gray">
                                    <MoreVertical size={16} />
                                </IconButton>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    )
}
