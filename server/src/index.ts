import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectToDB } from './config/mongoose';
import { locationRouter } from './modules/locations/router';
import { userRouter } from './modules/useres/router';

const app = express();

connectToDB();

// Allow client hosted on a different domain (Vercel) to call this API (Render).
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', locationRouter);
app.use('/api/users', userRouter);

const port = Number(process.env.PORT ?? 8000);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});