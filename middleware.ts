
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define protected routes
    const isProtected = path.startsWith('/admin') && !path.startsWith('/admin/login');
    const isLoginPage = path === '/admin/login';

    const token = request.cookies.get('admin-token')?.value;

    // If trying to access protected route without token, redirect to login
    if (isProtected && !token) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // If trying to access login page with token, redirect to dashboard
    if (isLoginPage && token) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
