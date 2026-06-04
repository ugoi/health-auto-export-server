import mongoose, { Schema, Document } from 'mongoose';

export interface HeartRateNotificationData {
  heartNotification: string;
  start: string;
  end: string;
  threshold: number;
  source?: { name: string; identifier: string };
  heartRateData?: {
    heartRate: number;
    hrUnits: string;
    timestamp: { start: string; end: string };
  }[];
  hrvData?: any[];
}

interface IHeartRateNotification extends Document {
  heartNotification: string;
  start: Date;
  end: Date;
  threshold: number;
  source: { name: string; identifier: string };
  heartRateData: {
    heartRate: number;
    hrUnits: string;
    timestamp: { start: Date; end: Date };
  }[];
  hrvData: any[];
  createdAt: Date;
  updatedAt: Date;
}

const HRNotificationDataSchema = new Schema(
  {
    heartRate: { type: Number, required: true },
    hrUnits: { type: String, required: true },
    timestamp: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
  },
  { _id: false, strict: false },
);

const HeartRateNotificationSchema = new Schema(
  {
    heartNotification: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    threshold: { type: Number, required: true },
    source: {
      name: { type: String },
      identifier: { type: String },
    },
    heartRateData: { type: [HRNotificationDataSchema], required: false },
    hrvData: { type: [Schema.Types.Mixed], required: false },
  },
  { timestamps: true },
);

HeartRateNotificationSchema.index({ start: 1 }, { unique: true });

export const HeartRateNotificationModel = mongoose.model<IHeartRateNotification>(
  'HeartRateNotification',
  HeartRateNotificationSchema,
  'heart_rate_notifications',
);
