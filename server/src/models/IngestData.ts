import { MetricData } from './Metric';
import { WorkoutData } from './Workout';
import { EcgData } from './Ecg';
import { HeartRateNotificationData } from './HeartRateNotification';

export interface IngestData {
  data: {
    metrics?: MetricData[];
    workouts?: WorkoutData[];
    ecg?: EcgData[];
    heartRateNotifications?: HeartRateNotificationData[];
  };
}
