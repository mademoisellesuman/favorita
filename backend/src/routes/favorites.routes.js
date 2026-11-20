import { Router } from 'express';
import { createSavedListController } from '../controllers/savedLists.controller.js';
import { Favorite } from '../models/SavedItem.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();
const { list, add, remove } = createSavedListController(Favorite);

router.use(requireUser);   // every route in this file requires login

router.get('/', list);
router.put('/:productId', add);
router.delete('/:productId', remove);

export default router;