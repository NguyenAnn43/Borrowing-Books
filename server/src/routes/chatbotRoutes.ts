import { Router, IRouter } from 'express';
import * as chatbotController from '../controllers/chatbotController';

const router: IRouter = Router();

// Endpoint: POST /api/chatbot
// We leave it optionally unauthenticated or adapt to the project
// If users need to be tracked, we could use authenticate, but here let's keep it open
router.post('/', chatbotController.chat);

export default router;
