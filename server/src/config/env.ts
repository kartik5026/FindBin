import dotenv from 'dotenv';
dotenv.config();
export const MONGODB_URI = process.env.MONGODB_URI ?? '';

export const SECRET_KEY =
  process.env.secret_key ?? process.env.SECRET_KEY ?? '';


