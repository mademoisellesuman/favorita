import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import {
  register, login, changePassword, logoutEverywhere
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registerLimiter, register);               // public
router.post('/login', loginLimiter, login);                        // public
router.put('/password', requireUser, loginLimiter, changePassword);
router.post('/logout-all', requireUser, logoutEverywhere);

export default router;