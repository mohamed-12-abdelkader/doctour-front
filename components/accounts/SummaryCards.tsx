import { Box, SimpleGrid, Text, Flex, Icon, FormatNumber } from '@chakra-ui/react'
import { Wallet, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { AccountSummary } from '@/types/accounts'

interface SummaryCardsProps {
    summary: AccountSummary
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
    const cards = [
        {
            label: 'إجمالي الدخل',
            value: summary.totalIncome,
            icon: TrendingUp,
            color: 'green.600',
            bg: 'green.50',
            borderColor: 'green.200'
        },
        {
            label: 'إجمالي المصروفات',
            value: summary.totalExpense,
            icon: TrendingDown,
            color: 'red.600',
            bg: 'red.50',
            borderColor: 'red.200'
        },
        {
            label: 'صافي الربح',
            value: summary.netProfit,
            icon: Wallet,
            color: summary.netProfit >= 0 ? 'blue.600' : 'orange.600',
            bg: summary.netProfit >= 0 ? 'blue.50' : 'orange.50',
            borderColor: summary.netProfit >= 0 ? 'blue.200' : 'orange.200'
        },
        {
            label: 'عدد العملاء',
            value: summary.clientsCount,
            icon: Users,
            color: 'purple.600',
            bg: 'purple.50',
            borderColor: 'purple.200',
            isCount: true
        }
    ]

    return (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4} mb={6}>
            {cards.map((card, index) => (
                <Box
                    key={index}
                    bg="white"
                    p={4}
                    rounded="xl"
                    shadow="sm"
                    border="1px solid"
                    borderColor={card.borderColor}
                    transition="transform 0.2s"
                    _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                >
                    <Flex justify="space-between" align="start" mb={2}>
                        <Box p={2} bg={card.bg} rounded="lg" color={card.color}>
                            <card.icon size={24} />
                        </Box>
                        {/* Decorative or percentage could go here */}
                    </Flex>
                    <Box>
                        <Text color="gray.500" fontSize="sm" fontWeight="medium" mb={1}>
                            {card.label}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                            {card.isCount ? (
                                card.value
                            ) : (
                                <FormatNumber value={card.value} style="currency" currency="EGP" />
                            )}
                        </Text>
                    </Box>
                </Box>
            ))}
        </SimpleGrid>
    )
}
