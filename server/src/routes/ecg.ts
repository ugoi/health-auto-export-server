import express from 'express';

import { getEcgRecordings, getEcgRecording } from '../controllers/ecg';

const router = express.Router();

router.get('/', getEcgRecordings);
router.get('/:id', getEcgRecording);

export default router;
