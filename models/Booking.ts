
import mongoose, { Schema, model, models } from 'mongoose';

const BookingSchema = new Schema({
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    amount: {
        type: Number,
        default: 0,
    },
    type: {
        type: String,
        enum: ['online', 'clinic'],
        default: 'online',
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'confirmed'],
        default: 'pending',
    },
    bookingTime: {
        type: String, // Storing as string to accommodate ISO date or user-friendly time
        required: true,
    },
}, {
    timestamps: true,
});

const Booking = models.Booking || model('Booking', BookingSchema);

export default Booking;
