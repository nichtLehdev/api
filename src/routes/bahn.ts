import { Router } from "express";
const router = Router();

import { getAllStationsController, getDatesOfJourneyController, getJourneyController, getStationController, getStatisticsController } from "../controllers/bahn";

router.get('/stations', getAllStationsController);
router.get('/statistics', getStatisticsController);
router.post('/station', getStationController);
router.post('/journey/dates', getDatesOfJourneyController);
router.post('/journey', getJourneyController);

export default router;