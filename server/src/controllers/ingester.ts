import { Request, Response } from 'express';

import { saveMetrics } from './metrics';
import { saveWorkouts } from './workouts';
import { saveEcg } from './ecg';
import { saveHeartRateNotifications } from './heartRateNotifications';
import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';

export const ingestData = async (req: Request, res: Response) => {
  let response: IngestResponse = {};

  try {
    const data = req.body as IngestData;

    if (!data) {
      throw new Error('No data provided');
    }

    const [metricsResponse, workoutsResponse, ecgResponse, hrNotifResponse] = await Promise.all([
      saveMetrics(data),
      saveWorkouts(data),
      saveEcg(data),
      saveHeartRateNotifications(data),
    ]);

    response = { ...metricsResponse, ...workoutsResponse, ...ecgResponse, ...hrNotifResponse };

    const hasErrors = Object.values(response).some((r) => !r.success);
    const allFailed = Object.values(response).every((r) => !r.success);

    if (allFailed) {
      res.status(500).json(response);
      return;
    }

    res.status(hasErrors ? 207 : 200).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
