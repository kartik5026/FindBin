import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const dustbinSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    location: { type: pointSchema, required: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  },
  { timestamps: true }
);

dustbinSchema.index({ location: '2dsphere' });

const DustbinModel = mongoose.model('dustbin', dustbinSchema);
export default DustbinModel;


