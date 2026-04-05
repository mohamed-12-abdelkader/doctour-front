'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { Toaster } from '@/components/ui/toaster'
import { DoctorRouteGuard } from '@/components/DoctorRouteGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <DoctorRouteGuard />
      {children}
      <Toaster />
    </ChakraProvider>
  )
}
