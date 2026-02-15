
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { name, phone, date, email, amount, type } = body;

        // Validation
        if (!name || !phone || !date) {
            return NextResponse.json(
                { message: 'Missing required fields: name, phone, date' },
                { status: 400 }
            );
        }

        const newBooking = await Booking.create({
            customerName: name,
            phoneNumber: phone,
            bookingTime: date,
            type: type || 'online',
            status: 'pending',
            email,
            amount,
        });

        return NextResponse.json({
            message: "Booking request submitted successfully.",
            booking: {
                id: newBooking._id,
                customerName: newBooking.customerName,
                customerPhone: newBooking.phoneNumber,
                appointmentDate: newBooking.bookingTime,
                status: newBooking.status,
                updatedAt: newBooking.updatedAt,
                createdAt: newBooking.createdAt
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
