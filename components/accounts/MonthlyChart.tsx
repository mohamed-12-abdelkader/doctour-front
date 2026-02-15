'use client'

import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { Transaction } from '@/types/accounts'
import { useMemo } from 'react'

interface MonthlyChartProps {
    transactions: Transaction[]
}

export default function MonthlyChart({ transactions }: MonthlyChartProps) {
    const data = useMemo(() => {
        // Group by day using date string as key
        const grouped: Record<string, { date: string, income: number, expense: number, timestamp: number }> = {}

        transactions.forEach(t => {
            const date = new Date(t.date)
            const dateStr = date.toLocaleDateString('en-GB') // DD/MM/YYYY

            if (!grouped[dateStr]) {
                grouped[dateStr] = {
                    date: dateStr,
                    income: 0,
                    expense: 0,
                    timestamp: date.setHours(0, 0, 0, 0) // Normalize time for sorting
                }
            }

            if (t.type === 'income') grouped[dateStr].income += t.amount
            else grouped[dateStr].expense += t.amount
        })

        // Sort by timestamp ascending and take the last 7 days
        return Object.values(grouped)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-7)
    }, [transactions])

    return (
        <Box bg="white" p={6} rounded="2xl" shadow="sm" mb={6}>
            <Flex justify="space-between" mb={4}>
                <Heading size="md" color="gray.700">تحليل الدخل والمصروفات</Heading>
                <Text fontSize="sm" color="gray.500">آخر 7 أيام نشطة</Text>
            </Flex>
            <Box h="300px" w="100%" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="income" fill="#48BB78" name="Income" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#F56565" name="Expense" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    )
}
