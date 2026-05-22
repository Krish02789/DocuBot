import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import uploadRouter from "./upload.js";
import chatRouter from "./chat.js";
import documentsRouter from "./documents.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(chatRouter);
router.use(documentsRouter);

export default router;
