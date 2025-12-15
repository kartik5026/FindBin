import mongoose from "mongoose";
import { MONGODB_URI } from "./env";

export async function connectToDB() {
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not set');
        }
        await mongoose.connect(MONGODB_URI);
        console.log('connected to mongodb');
    } catch (error) {
        console.log(error);

    }
}
