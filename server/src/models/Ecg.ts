import mongoose, { Schema, Document } from 'mongoose';

export interface EcgData {
  numberOfVoltageMeasurements: number;
  samplingFrequency: number;
  start: string;
  end: string;
  averageHeartRate: number;
  classification: string;
  source: string;
  voltageMeasurements?: { voltage: number; units: string; date: number }[];
}

interface IEcg extends Document {
  start: Date;
  end: Date;
  averageHeartRate: number;
  classification: string;
  samplingFrequency: number;
  numberOfVoltageMeasurements: number;
  source: string;
  voltageMeasurements: { voltage: number; units: string; date: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const VoltageMeasurementSchema = new Schema(
  {
    voltage: { type: Number, required: true },
    units: { type: String, required: true },
    date: { type: Number, required: true },
  },
  { _id: false },
);

const EcgSchema = new Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    averageHeartRate: { type: Number, required: true },
    classification: { type: String, required: true },
    samplingFrequency: { type: Number, required: true },
    numberOfVoltageMeasurements: { type: Number, required: true },
    source: { type: String, required: true },
    voltageMeasurements: { type: [VoltageMeasurementSchema], required: false },
  },
  { timestamps: true },
);

EcgSchema.index({ start: 1 }, { unique: true });

export const EcgModel = mongoose.model<IEcg>('Ecg', EcgSchema, 'ecg');
