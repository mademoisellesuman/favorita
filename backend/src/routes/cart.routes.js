import { Router } from 'express';
import { createSavedListController } from '../controllers/savedLists.controller.js';
import { Cart } from '../models/SavedItem.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();
const { list, add, remove } = createSavedListController(Cart);

router.use(requireUser);

router.get('/', list);
router.put('/:productId', add);
router.delete('/:productId', remove);

export default router;