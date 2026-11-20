import { Router } from 'express';
import { goToShop } from '../controllers/go.controller.js';

const router = Router();
router.get('/:productId/:platform', goToShop);   // public: shoppers don't log in
export default router;