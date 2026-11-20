import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  listProducts, listBrands, getProduct, createProduct, updateProduct, deleteProduct
} from '../controllers/products.controller.js';

const router = Router();

router.get('/', listProducts);
router.get('/brands', listBrands);                   // ⚠️ must come BEFORE '/:id'
router.get('/:id', getProduct);
router.post('/', requireUser, createProduct);
router.put('/:id', requireUser, updateProduct);
router.delete('/:id', requireUser, deleteProduct);

export default router;