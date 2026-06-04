import { Request, Response } from 'express';

import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';
import { EcgModel } from '../models/Ecg';

export const getEcgRecordings = async (req: Request, res: Response) => {
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

    const recordings = await EcgModel.find(query)
      .sort({ start: -1 })
      .lean()
      .then((docs) =>
        docs.map((doc) => ({
          id: doc._id,
          start: new Date(doc.start).toISOString(),
          end: new Date(doc.end).toISOString(),
          average_heart_rate: doc.averageHeartRate,
          classification: doc.classification,
          sampling_frequency: doc.samplingFrequency,
          number_of_voltage_measurements: doc.numberOfVoltageMeasurements,
          source: doc.source,
        })),
      );

    res.status(200).json(recordings);
  } catch (error) {
    console.error('Error fetching ECG recordings:', error);
    res.status(500).json({ error: 'Error fetching ECG recordings' });
  }
};

export const getEcgRecording = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await EcgModel.findById(id).lean();

    if (!doc) {
      return res.status(404).json({ error: 'ECG recording not found' });
    }

    res.status(200).json({
      id: doc._id,
      start: new Date(doc.start).toISOString(),
      end: new Date(doc.end).toISOString(),
      average_heart_rate: doc.averageHeartRate,
      classification: doc.classification,
      sampling_frequency: doc.samplingFrequency,
      number_of_voltage_measurements: doc.numberOfVoltageMeasurements,
      source: doc.source,
      voltage_measurements: doc.voltageMeasurements,
    });
  } catch (error) {
    console.error('Error fetching ECG recording:', error);
    res.status(500).json({ error: 'Error fetching ECG recording' });
  }
};

export const saveEcg = async (ingestData: IngestData): Promise<IngestResponse> => {
  try {
    const response: IngestResponse = {};
    const ecgRecordings = ingestData.data.ecg;

    if (!ecgRecordings || !ecgRecordings.length) {
      return response;
    }

    const operations = ecgRecordings.map((ecg) => ({
      updateOne: {
        filter: { start: new Date(ecg.start) },
        update: {
          $set: {
            start: new Date(ecg.start),
            end: new Date(ecg.end),
            averageHeartRate: ecg.averageHeartRate,
            classification: ecg.classification,
            samplingFrequency: ecg.samplingFrequency,
            numberOfVoltageMeasurements: ecg.numberOfVoltageMeasurements,
            source: ecg.source,
            voltageMeasurements: ecg.voltageMeasurements || [],
          },
        },
        upsert: true,
      },
    }));

    await EcgModel.bulkWrite(operations);

    response.ecg = {
      success: true,
      message: `${operations.length} ECG recordings saved successfully`,
    };

    console.debug(`Processed ${ecgRecordings.length} ECG recordings`);
    return response;
  } catch (error) {
    console.error('Error processing ECG:', error);
    return {
      ecg: {
        success: false,
        message: 'ECG not saved',
        error: error instanceof Error ? error.message : 'An error occurred',
      },
    };
  }
};
