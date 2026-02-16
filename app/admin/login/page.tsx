'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Heading,
    Input,
    Stack,
    Text,
    Container,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/axios';

const MotionFlex = motion(Flex);

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setNotification(null);

        try {
            // Using the configured axios instance
            const response = await api.post('/auth/login', {
                email,
                password,
            });

            const data = response.data;

            if (data.token) {
                setNotification({ type: 'success', message: 'Login Successful! Redirecting...' });

                // Save to Local Storage as requested
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));

                // Set a cookie for the existing Middleware to allow access to /admin routes
                // Set a cookie for the existing Middleware to allow access to /admin routes
                // Note: Removed 'Secure' for localhost development compatibility. 
                // In production with HTTPS, 'Secure' should be added back.
                document.cookie = `admin-token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

                setTimeout(() => {
                    window.location.href = '/admin/dashboard';
                }, 500);
            } else {
                throw new Error('No token received');
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
            setNotification({ type: 'error', message: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            minH="100vh"
            w="100%"
            bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            overflow="hidden"
            dir="ltr"
        >
            {/* Background decoration */}
            <Box
                position="absolute"
                top="-10%"
                left="-10%"
                w="500px"
                h="500px"
                bg="rgba(97, 91, 54, 0.05)"
                borderRadius="full"
                filter="blur(80px)"
                zIndex={0}
            />

            <Box
                position="absolute"
                bottom="-10%"
                right="-10%"
                w="500px"
                h="500px"
                bg="rgba(84, 79, 48, 0.05)"
                borderRadius="full"
                filter="blur(80px)"
                zIndex={0}
            />

            <Container maxW="md" position="relative" zIndex={1}>
                {/* @ts-ignore */}
                <MotionFlex
                    direction="column"
                    bg="white"
                    p={8}
                    borderRadius="xl"
                    boxShadow="xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    border="1px solid"
                    borderColor="gray.100"
                >
                    {/* @ts-ignore */}
                    <Stack spacing={6} align="center" mb={8}>
                        <Box
                            p={3}
                            bg="rgba(97, 91, 54, 0.1)"
                            borderRadius="full"
                            color="#544f30"
                        >
                            <LogIn size={32} />
                        </Box>
                        <Box textAlign="center">
                            <Heading
                                as="h1"
                                size="xl"
                                mb={2}
                                color="#544f30"
                                fontFamily="var(--font-cairo)"
                            >
                                Admin Login
                            </Heading>
                            <Text color="gray.500" fontSize="sm">
                                Enter your credentials to access the dashboard
                            </Text>
                        </Box>
                    </Stack>

                    {notification && (
                        <Box
                            mb={4}
                            p={3}
                            borderRadius="md"
                            bg={notification.type === 'success' ? 'green.100' : 'red.100'}
                            color={notification.type === 'success' ? 'green.800' : 'red.800'}
                            textAlign="center"
                            fontSize="sm"
                        >
                            {notification.message}
                        </Box>
                    )}

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        {/* @ts-ignore */}
                        <Stack spacing={5}>
                            <Box>
                                <Text mb={2} fontWeight="medium" fontSize="sm" color="gray.600">
                                    Email Address
                                </Text>
                                <Box position="relative">
                                    <Box
                                        position="absolute"
                                        top="0"
                                        left="0"
                                        height="100%"
                                        width="40px"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        zIndex="2"
                                        pointerEvents="none"
                                    >
                                        <Mail size={18} color="#A0AEC0" />
                                    </Box>
                                    <Input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        bg="gray.50"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        _focus={{
                                            borderColor: '#615b36',
                                            boxShadow: '0 0 0 1px #615b36',
                                            bg: 'white'
                                        }}
                                        _hover={{
                                            borderColor: 'gray.300'
                                        }}
                                        height="48px"
                                        fontSize="md"
                                        pl="40px"
                                        required
                                    />
                                </Box>
                            </Box>

                            <Box>
                                <Text mb={2} fontWeight="medium" fontSize="sm" color="gray.600">
                                    Password
                                </Text>
                                <Box position="relative">
                                    <Box
                                        position="absolute"
                                        top="0"
                                        left="0"
                                        height="100%"
                                        width="40px"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        zIndex="2"
                                        pointerEvents="none"
                                    >
                                        <Lock size={18} color="#A0AEC0" />
                                    </Box>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        bg="gray.50"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        _focus={{
                                            borderColor: '#615b36',
                                            boxShadow: '0 0 0 1px #615b36',
                                            bg: 'white'
                                        }}
                                        _hover={{
                                            borderColor: 'gray.300'
                                        }}
                                        height="48px"
                                        fontSize="md"
                                        pl="40px"
                                        required
                                    />
                                </Box>
                            </Box>

                            <Button
                                type="submit"
                                // @ts-ignore
                                isLoading={isLoading}
                                loadingText="Signing in..."
                                bg="#615b36"
                                color="white"
                                size="lg"
                                height="50px"
                                fontSize="md"
                                fontWeight="bold"
                                mt={2}
                                _hover={{
                                    bg: '#4a452a',
                                    transform: 'translateY(-1px)',
                                    boxShadow: 'md',
                                }}
                                _active={{
                                    bg: '#3e3a23',
                                    transform: 'translateY(0)',
                                }}
                                transition="all 0.2s"
                                fontFamily="var(--font-tajawal)"
                            >
                                Sign In
                            </Button>
                        </Stack>
                    </form>
                </MotionFlex>

                <Text mt={6} textAlign="center" color="gray.500" fontSize="xs">
                    © {new Date().getFullYear()} DocTour Admin. All rights reserved.
                </Text>
            </Container>
        </Box>
    );
}
