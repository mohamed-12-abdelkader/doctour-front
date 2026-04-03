'use client'

import dynamic from 'next/dynamic'

/** Placeholder ثابت — يُستخدم على السيرفر وعند التحميل؛ يتطابق مع ما يتوقعه next/dynamic */
function NavbarSkeleton() {
    return (
        <div
            style={{ minHeight: 72, width: '100%' }}
            aria-hidden
            suppressHydrationWarning
        />
    )
}

const Navbar = dynamic(() => import('@/components/Navbar'), {
    ssr: false,
    loading: NavbarSkeleton,
})

export default function NavbarDynamic() {
    return <Navbar />
}
