import { Router } from 'express'
import { verifyJWT, authorizeRole } from '../middleware/AuthMiddleware';
import controller from '../controllers/Topups/Topup'
import orderController from '../controllers/Topups/TopupOrder'

import { post, route } from './User';

const router = Router()

router.post('/', verifyJWT, controller.create);
router.patch('/:id', verifyJWT, controller.patchTopup);
router.delete('/:id', verifyJWT, controller.deleteTopup);
router.get('/', verifyJWT, controller.getTopups);

router.post('/orders', verifyJWT, orderController.create);

export = router;