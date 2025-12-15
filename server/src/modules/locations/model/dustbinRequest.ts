import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const dustbinRequestSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true },
    note: { type: String, trim: true },
    location: { type: pointSchema, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    createdByEmail: { type: String, trim: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    dustbinId: { type: mongoose.Schema.Types.ObjectId, ref: 'dustbin' },
  },
  { timestamps: true }
);

dustbinRequestSchema.index({ location: '2dsphere' });

const DustbinRequestModel = mongoose.model('dustbin_request', dustbinRequestSchema);
export default DustbinRequestModel;


