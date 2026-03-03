'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Text, Flex, Badge, IconButton, Stack, Button } from '@chakra-ui/react'
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react'
import api from '@/lib/axios'
import { Notification, NotificationsResponse } from '@/types/booking'

const POLL_INTERVAL = 30_000 // 30 ثانية

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'الآن'
    if (m < 60) return `منذ ${m} د`
    const h = Math.floor(m / 60)
    if (h < 24) return `منذ ${h} س`
    return `منذ ${Math.floor(h / 24)} ي`
}

export default function NotificationsBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchNotifications = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true)
        try {
            const res = await api.get<NotificationsResponse>('/notifications', {
                params: { limit: 20, page: 1 },
            })
            setNotifications(res.data.notifications)
            setUnreadCount(res.data.unreadCount)
        } catch {
            // صامت — لو مفيش صلاحية أو السيرفر وقف
        } finally {
            if (!quiet) setLoading(false)
        }
    }, [])

    // Initial fetch + polling
    useEffect(() => {
        fetchNotifications()
        intervalRef.current = setInterval(() => fetchNotifications(true), POLL_INTERVAL)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [fetchNotifications])

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const markRead = async (id: number) => {
        try {
            await api.patch(`/notifications/${id}/read`)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
            setUnreadCount(c => Math.max(0, c - 1))
        } catch { }
    }

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all')
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
        } catch { }
    }

    const deleteNotification = async (id: number) => {
        try {
            await api.delete(`/notifications/${id}`)
            setNotifications(prev => prev.filter(n => n.id !== id))
            setUnreadCount(c => {
                const wasUnread = notifications.find(n => n.id === id)?.isRead === false
                return wasUnread ? Math.max(0, c - 1) : c
            })
        } catch { }
    }

    const toggleOpen = () => {
        setIsOpen(o => !o)
        if (!isOpen) fetchNotifications()
    }

    return (
        <Box position="relative" ref={panelRef}>
            {/* Bell icon */}
            <Box position="relative" display="inline-flex">
                <IconButton
                    aria-label="الإشعارات"
                    variant="ghost"
                    color="gray.600"
                    _hover={{ bg: 'orange.50', color: '#615b36' }}
                    onClick={toggleOpen}
                    borderRadius="xl"
                >
                    <Bell size={22} />
                </IconButton>
                {unreadCount > 0 && (
                    <Box
                        position="absolute"
                        top="-2px"
                        right="-2px"
                        bg="red.500"
                        color="white"
                        borderRadius="full"
                        minW="18px"
                        h="18px"
                        fontSize="10px"
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        px="3px"
                        border="2px solid white"
                        pointerEvents="none"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Box>
                )}
            </Box>

            {/* Dropdown panel */}
            {isOpen && (
                <Box
                    position="absolute"
                    top="calc(100% + 8px)"
                    left={{ base: 'auto', md: '0' }}
                    right={{ base: '0', md: 'auto' }}
                    w={{ base: '320px', md: '380px' }}
                    bg="white"
                    borderRadius="2xl"
                    boxShadow="0 20px 60px rgba(0,0,0,0.15)"
                    border="1px solid"
                    borderColor="gray.100"
                    zIndex={2000}
                    overflow="hidden"
                    dir="rtl"
                >
                    {/* Header */}
                    <Flex
                        align="center"
                        justify="space-between"
                        px={4} py={3}
                        bg="#fdfbf7"
                        borderBottom="1px solid"
                        borderColor="gray.100"
                    >
                        <Flex align="center" gap={2}>
                            <Bell size={16} color="#615b36" />
                            <Text fontWeight="bold" fontSize="sm" color="#615b36">الإشعارات</Text>
                            {unreadCount > 0 && (
                                <Badge colorPalette="red" variant="solid" borderRadius="full" fontSize="10px" px={2}>
                                    {unreadCount}
                                </Badge>
                            )}
                        </Flex>
                        <Flex gap={1}>
                            {unreadCount > 0 && (
                                <Button
                                    size="xs" variant="ghost" colorPalette="gray"
                                    onClick={markAllRead}
                                    title="تحديد الكل كمقروء"
                                >
                                    <CheckCheck size={14} />
                                    <Text fontSize="xs" mr={1}>الكل مقروء</Text>
                                </Button>
                            )}
                            <IconButton
                                aria-label="إغلاق" size="xs" variant="ghost" colorPalette="gray"
                                onClick={() => setIsOpen(false)}
                            ><X size={14} /></IconButton>
                        </Flex>
                    </Flex>

                    {/* List */}
                    <Box maxH="400px" overflowY="auto">
                        {loading ? (
                            <Flex justify="center" align="center" py={8}>
                                <Text fontSize="sm" color="gray.400">جاري التحميل...</Text>
                            </Flex>
                        ) : notifications.length === 0 ? (
                            <Flex direction="column" align="center" justify="center" py={10} gap={2}>
                                <Bell size={32} color="#e2e8f0" />
                                <Text fontSize="sm" color="gray.400">لا توجد إشعارات</Text>
                            </Flex>
                        ) : (
                            <Stack gap={0}>
                                {notifications.map(n => (
                                    <Box
                                        key={n.id}
                                        px={4} py={3}
                                        bg={n.isRead ? 'white' : '#fffbf0'}
                                        borderBottom="1px solid"
                                        borderColor="gray.50"
                                        _hover={{ bg: n.isRead ? 'gray.50' : '#fff8e6' }}
                                        transition="background 0.15s"
                                        position="relative"
                                    >
                                        {/* Unread indicator */}
                                        {!n.isRead && (
                                            <Box
                                                position="absolute"
                                                top={0} right={0} bottom={0}
                                                w="3px"
                                                bg="#615b36"
                                                borderRadius="0 2xl 2xl 0"
                                            />
                                        )}
                                        <Flex justify="space-between" align="flex-start" gap={2}>
                                            <Box flex={1} minW={0}>
                                                <Text fontSize="sm" fontWeight={n.isRead ? 'normal' : 'bold'} color="gray.800" mb={0.5}>
                                                    {n.title}
                                                </Text>
                                                <Text fontSize="xs" color="gray.500" lineClamp={2}>
                                                    {n.message}
                                                </Text>
                                                <Text fontSize="10px" color="gray.400" mt={1}>
                                                    {timeAgo(n.createdAt)}
                                                </Text>
                                            </Box>
                                            <Flex gap={0.5} flexShrink={0}>
                                                {!n.isRead && (
                                                    <IconButton
                                                        aria-label="تحديد كمقروء"
                                                        size="2xs" variant="ghost" colorPalette="green"
                                                        onClick={() => markRead(n.id)}
                                                        title="تحديد كمقروء"
                                                    ><Check size={12} /></IconButton>
                                                )}
                                                <IconButton
                                                    aria-label="حذف"
                                                    size="2xs" variant="ghost" colorPalette="red"
                                                    onClick={() => deleteNotification(n.id)}
                                                    title="حذف الإشعار"
                                                ><Trash2 size={12} /></IconButton>
                                            </Flex>
                                        </Flex>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <Flex
                            justify="center" py={2}
                            borderTop="1px solid" borderColor="gray.100"
                            bg="gray.50"
                        >
                            <Button
                                size="xs" variant="ghost" colorPalette="gray"
                                onClick={() => fetchNotifications()}
                            >
                                تحديث
                            </Button>
                        </Flex>
                    )}
                </Box>
            )}
        </Box>
    )
}
