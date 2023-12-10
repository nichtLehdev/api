import express from 'express';
import bahnRouter from './routes/bahn';
import bodyParser from 'body-parser';
import * as Cache from 'memory-cache';
import { getAllStations } from './services/bahn';

const app = express();

app.use(bodyParser.json());

app.use('/bahn/v1/', bahnRouter);
// app.use

(async () => {
    //run db query and cache result
    const stations = await getAllStations();
    Cache.put('stations', JSON.stringify(stations.stations));
})();

export default app;