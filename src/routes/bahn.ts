import { Router } from "express";
import { cache } from '../middleware/cache';
const router = Router();

import { 
    getAllStationsController, 
    getDatesOfJourneyController, 
    getJourneyController, 
    getJourneysOfStationController, 
    getStationController, 
    getStatisticsController 
} from "../controllers/bahn";

router.get('/statistics', cache(30), getStatisticsController);
router.get('/stations',cache(30), getAllStationsController);

router.post('/station', getStationController);
router.post('/station/journeys', getJourneysOfStationController);
router.post('/journey/dates', getDatesOfJourneyController);
router.post('/journey', getJourneyController);

export default router;