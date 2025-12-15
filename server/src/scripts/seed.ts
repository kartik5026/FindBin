import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectToDB } from '../config/mongoose';
import userModel from '../modules/useres/model';
import { DustbinModel, DustbinRequestModel } from '../modules/locations/model';

type SeedDustbin = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const base = { lat: 30.9702876, lng: 76.8028933 };

const dustbins: SeedDustbin[] = [
  {
    name: 'Dustbin - Main Market',
    address: 'Main Market Road (sample)',
    lat: base.lat + 0.0021,
    lng: base.lng - 0.0015,
  },
  {
    name: 'Dustbin - Bus Stop',
    address: 'Near Bus Stop (sample)',
    lat: base.lat - 0.0012,
    lng: base.lng + 0.0009,
  },
  {
    name: 'Dustbin - Park Gate',
    address: 'City Park Gate (sample)',
    lat: base.lat + 0.0006,
    lng: base.lng + 0.0024,
  },
  {
    name: 'Dustbin - School',
    address: 'Outside School (sample)',
    lat: base.lat - 0.002,
    lng: base.lng - 0.0022,
  },
];

async function upsertAdminUser() {
  const email = 'admin@gmail.com';
  const password = 'password';

  await userModel.updateOne(
    { email },
    {
      $set: {
        userName: 'Admin',
        email,
        password: bcrypt.hashSync(password, 10),
        role: 'admin',
        phone: 9999999999,
      },
    },
    { upsert: true }
  );

  const admin = await userModel.findOne({ email });
  if (!admin) throw new Error('Failed to upsert admin user');
  return admin;
}

async function upsertDustbins(adminId: mongoose.Types.ObjectId) {
  for (const d of dustbins) {
    await DustbinModel.updateOne(
      { name: d.name },
      {
        $set: {
          name: d.name,
          address: d.address,
          location: { type: 'Point', coordinates: [d.lng, d.lat] },
          createdByUserId: adminId,
        },
      },
      { upsert: true }
    );
  }
}

async function upsertSampleRequest() {
  await DustbinRequestModel.updateOne(
    { createdByEmail: 'user@findbin.local', note: 'Sample request (pending)' },
    {
      $setOnInsert: {
        createdByEmail: 'user@findbin.local',
        address: 'Near Hospital (sample)',
        note: 'Sample request (pending)',
        location: {
          type: 'Point',
          coordinates: [base.lng + 0.0031, base.lat - 0.0018],
        },
        status: 'pending',
      },
    },
    { upsert: true }
  );
}

async function main() {
  await connectToDB();

  const admin = await upsertAdminUser();
  await upsertDustbins(admin._id);
  await upsertSampleRequest();

  const dustbinCount = await DustbinModel.estimatedDocumentCount();
  const reqCount = await DustbinRequestModel.estimatedDocumentCount();

  console.log('Seed complete.');
  console.log(`Admin login: admin@gmail.com / password`);
  console.log(`Dustbins: ${dustbinCount}`);
  console.log(`Dustbin requests: ${reqCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });


