import express from 'express';

import { getHeartRateNotifications } from '../controllers/heartRateNotifications';

const router = express.Router();

router.get('/', getHeartRateNotifications);

export default router;
