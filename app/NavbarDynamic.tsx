'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const Navbar = dynamic(() => import('@/components/Navbar'), { ssr: false })

export default function NavbarDynamic() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    // نفس المحتوى على السيرفر وأول رسم على العميل لتجنب hydration mismatch
    if (!mounted) {
        return <div style={{ minHeight: 72, width: '100%' }} aria-hidden />
    }

    return <Navbar />
}
