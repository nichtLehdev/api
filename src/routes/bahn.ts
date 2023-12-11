import { Router } from "express";
import { cache } from '../middleware/cache';
const router = Router();

import { 
    getAllStationsController, 
    getDatesOfJourneyController, 
    getJourneyController, 
    getJourneysOfStationController, 
    getStationConnectionsController, 
    getStationController, 
    getStatisticsController 
} from "../controllers/bahn";

router.get('/statistics', cache(30), getStatisticsController);
router.get('/stations',cache(30), getAllStationsController);

// Either stationName, eva or ds100 must be provided in the body
router.post('/station', getStationController);
// ds100 and date must be provided in the body
router.post('/station/journeys', getJourneysOfStationController);
// trainType and trainNumber must be provided in the body
router.post('/journey/dates', getDatesOfJourneyController);
// trainType, trainNumber and date must be provided in the body
router.post('/journey', getJourneyController);
// ds100 must be provided in the body
router.post('/station/connections', getStationConnectionsController);

export default router;