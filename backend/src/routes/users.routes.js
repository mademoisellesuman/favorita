import { Router } from 'express';
import {
  listUsers, getUser, getMe, updateMe, changeUsername
} from '../controllers/users.controller.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();

router.get('/', listUsers);                               // public
router.get('/me', requireUser, getMe);                    // ⚠️ must come BEFORE '/:username'
router.put('/me', requireUser, updateMe);
router.put('/me/username', requireUser, changeUsername);
router.get('/:username', getUser);                        // public

export default router;