import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { linkStats } from '../controllers/stats.controller.js';

const router = Router();
router.get('/links', requireUser, linkStats);
export default router;