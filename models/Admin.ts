
import mongoose, { Schema, model, models } from 'mongoose';

const AdminSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const Admin = models.Admin || model('Admin', AdminSchema);

export default Admin;
