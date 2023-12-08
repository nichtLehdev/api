import { Router } from "express";
const router = Router();

import { getAllStationsController } from "../controllers/bahn";

router.get('/stations', getAllStationsController);

export default router;