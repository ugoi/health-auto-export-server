import mongoose, { Schema, Document } from 'mongoose';

interface IQuantityMetric {
  qty: number;
  date: Date;
  units: string;
  source: string;
}

interface IMeasurement {
  qty: number;
  units: string;
  date: Date;
  source: string;
}

interface IHeartRate extends IMeasurement {
  Min: number;
  Avg: number;
  Max: number;
  date: Date;
  units: string;
  source: string;
}

interface IHeartRateSummary {
  avg?: IMeasurement;
  min?: IMeasurement;
  max?: IMeasurement;
}

interface ILocation {
  latitude: number;
  longitude: number;
  course: number;
  courseAccuracy: number;
  speed: number;
  speedAccuracy: number;
  altitude: number;
  verticalAccuracy: number;
  horizontalAccuracy: number;
  timestamp: Date;
}

interface IRoute {
  workoutId: string;
  locations: ILocation[];
}

interface ISwimStroke {
  qty: number;
  units: string;
  date: Date;
  source: string;
  style?: string;
}

export interface WorkoutData {
  id: string;
  name: string;
  start: Date;
  end: Date;
  duration: number;
  distance?: IMeasurement;
  activeEnergyBurned?: IMeasurement;
  activeEnergy?: IQuantityMetric[];
  heartRateData?: IHeartRate[];
  heartRateRecovery?: IHeartRate[];
  heartRate?: IHeartRateSummary;
  avgHeartRate?: IMeasurement;
  maxHeartRate?: IMeasurement;
  stepCount?: IQuantityMetric[];
  stepCadence?: IQuantityMetric[];
  temperature?: IMeasurement;
  humidity?: IMeasurement;
  intensity?: IMeasurement;
  speed?: IMeasurement;
  avgSpeed?: IMeasurement;
  maxSpeed?: IMeasurement;
  route?: ILocation[];
  isIndoor?: boolean;
  location?: string;
  metadata?: Record<string, any>;
  // Swim fields
  swimCadence?: IMeasurement;
  swimDistance?: IQuantityMetric[];
  swimStroke?: ISwimStroke[];
  totalSwimmingStrokeCount?: IMeasurement;
  lapLength?: IMeasurement;
  // Run/walk fields
  walkingAndRunningDistance?: IQuantityMetric[];
  // Cycling fields
  cyclingDistance?: IQuantityMetric[];
  // Elevation fields
  elevationUp?: IMeasurement;
  elevationDown?: IMeasurement;
}

interface IWorkout extends Document, Omit<WorkoutData, 'id' | 'route'> {
  workoutId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeasurementSchema = new Schema(
  {
    qty: { type: Number, required: true },
    units: { type: String, required: true },
  },
  { _id: false, strict: false },
);

const QuantityMetricSchema = new Schema<IQuantityMetric>(
  {
    qty: { type: Number, required: true, min: 0 },
    units: { type: String, required: true },
    date: { type: Date, required: true },
    source: { type: String, required: true },
  },
  { _id: false },
);

const HeartRateSchema = new Schema<IHeartRate>(
  {
    Min: { type: Number, required: true, min: 0 },
    Avg: { type: Number, required: true, min: 0 },
    Max: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    units: { type: String, required: true },
    source: { type: String, required: true },
  },
  { _id: false },
);

const HeartRateSummarySchema = new Schema(
  {
    avg: { type: MeasurementSchema, required: false },
    min: { type: MeasurementSchema, required: false },
    max: { type: MeasurementSchema, required: false },
  },
  { _id: false },
);

const WorkoutSchema = new Schema(
  {
    workoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    activeEnergyBurned: {
      type: MeasurementSchema,
      required: false,
    },
    distance: {
      type: MeasurementSchema,
      required: false,
    },
    activeEnergy: {
      type: [QuantityMetricSchema],
      required: false,
    },
    heartRateData: {
      type: [HeartRateSchema],
      required: false,
    },
    heartRateRecovery: {
      type: [HeartRateSchema],
      required: false,
    },
    heartRate: {
      type: HeartRateSummarySchema,
      required: false,
    },
    avgHeartRate: {
      type: MeasurementSchema,
      required: false,
    },
    maxHeartRate: {
      type: MeasurementSchema,
      required: false,
    },
    stepCount: {
      type: [QuantityMetricSchema],
      required: false,
    },
    stepCadence: {
      type: [QuantityMetricSchema],
      required: false,
    },
    temperature: {
      type: MeasurementSchema,
      required: false,
    },
    humidity: {
      type: MeasurementSchema,
      required: false,
    },
    intensity: {
      type: MeasurementSchema,
      required: false,
    },
    speed: {
      type: MeasurementSchema,
      required: false,
    },
    avgSpeed: {
      type: MeasurementSchema,
      required: false,
    },
    maxSpeed: {
      type: MeasurementSchema,
      required: false,
    },
    isIndoor: {
      type: Boolean,
      required: false,
    },
    location: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
    // Swim fields
    swimCadence: {
      type: MeasurementSchema,
      required: false,
    },
    swimDistance: {
      type: [QuantityMetricSchema],
      required: false,
    },
    swimStroke: {
      type: [Schema.Types.Mixed],
      required: false,
    },
    totalSwimmingStrokeCount: {
      type: MeasurementSchema,
      required: false,
    },
    lapLength: {
      type: MeasurementSchema,
      required: false,
    },
    // Run/walk fields
    walkingAndRunningDistance: {
      type: [QuantityMetricSchema],
      required: false,
    },
    // Cycling fields
    cyclingDistance: {
      type: [QuantityMetricSchema],
      required: false,
    },
    // Elevation fields
    elevationUp: {
      type: MeasurementSchema,
      required: false,
    },
    elevationDown: {
      type: MeasurementSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const locationSchema = new Schema<ILocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    course: { type: Number, required: false },
    courseAccuracy: { type: Number, required: false },
    speed: { type: Number, required: false },
    speedAccuracy: { type: Number, required: false },
    altitude: { type: Number, required: false },
    verticalAccuracy: { type: Number, required: false },
    horizontalAccuracy: { type: Number, required: false },
  },
  { _id: false },
);

const routeSchema = new Schema<IRoute>(
  {
    workoutId: { type: String, required: true },
    locations: {
      type: [locationSchema],
      required: true,
      validate: {
        validator: function (array: ILocation[]) {
          return array.length > 0;
        },
        message: 'Locations array must contain at least one point',
      },
    },
  },
  { timestamps: true },
);

export function mapWorkoutData(data: WorkoutData) {
  const { id, ...rest } = data;

  rest.start = new Date(rest.start);
  rest.end = new Date(rest.end);

  return {
    workoutId: id,
    ...rest,
  };
}

export function mapRoute(data: WorkoutData) {
  return {
    workoutId: data.id,
    locations: data.route?.map((loc) => ({
      ...loc,
      timestamp: new Date(loc.timestamp),
    })),
  };
}

export const WorkoutModel = mongoose.model<IWorkout>('Workout', WorkoutSchema, 'workouts');
export const RouteModel = mongoose.model<IRoute>('Route', routeSchema, 'workout_routes');
