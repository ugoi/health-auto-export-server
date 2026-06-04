interface IngestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface IngestResponse {
  metrics?: IngestResult;
  workouts?: IngestResult;
  ecg?: IngestResult;
  heartRateNotifications?: IngestResult;
}
