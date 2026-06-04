import { Request, Response } from 'express';

import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';
import { HeartRateNotificationModel } from '../models/HeartRateNotification';

export const getHeartRateNotifications = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate && endDate) {
      query = {
        start: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string),
        },
      };
    }

    const notifications = await HeartRateNotificationModel.find(query)
      .sort({ start: -1 })
      .lean()
      .then((docs) =>
        docs.map((doc) => ({
          id: doc._id,
          type: doc.heartNotification,
          start: new Date(doc.start).toISOString(),
          end: new Date(doc.end).toISOString(),
          threshold: doc.threshold,
          source: doc.source?.name || null,
          heart_rate_readings: doc.heartRateData?.map((hr) => ({
            heart_rate: hr.heartRate,
            units: hr.hrUnits,
            time: new Date(hr.timestamp.start).toISOString(),
          })) || [],
        })),
      );

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching heart rate notifications:', error);
    res.status(500).json({ error: 'Error fetching heart rate notifications' });
  }
};

export const saveHeartRateNotifications = async (ingestData: IngestData): Promise<IngestResponse> => {
  try {
    const response: IngestResponse = {};
    const notifications = ingestData.data.heartRateNotifications;

    if (!notifications || !notifications.length) {
      return response;
    }

    const operations = notifications.map((n) => ({
      updateOne: {
        filter: { start: new Date(n.start) },
        update: {
          $set: {
            heartNotification: n.heartNotification,
            start: new Date(n.start),
            end: new Date(n.end),
            threshold: n.threshold,
            source: n.source,
            heartRateData: n.heartRateData?.map((hr) => ({
              heartRate: hr.heartRate,
              hrUnits: hr.hrUnits,
              timestamp: {
                start: new Date(hr.timestamp.start),
                end: new Date(hr.timestamp.end),
              },
            })),
            hrvData: n.hrvData || [],
          },
        },
        upsert: true,
      },
    }));

    await HeartRateNotificationModel.bulkWrite(operations);

    response.heartRateNotifications = {
      success: true,
      message: `${operations.length} heart rate notifications saved successfully`,
    };

    console.debug(`Processed ${notifications.length} heart rate notifications`);
    return response;
  } catch (error) {
    console.error('Error processing heart rate notifications:', error);
    return {
      heartRateNotifications: {
        success: false,
        message: 'Heart rate notifications not saved',
        error: error instanceof Error ? error.message : 'An error occurred',
      },
    };
  }
};
