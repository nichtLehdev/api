import { getAllConnections, getAllStations, getDatesOfJourney, getJourney, getJourneyOfStationByDs100, getJourneyStationReference, getStationByDs100, getStationByEva, getStationByName, getStationConnections, getStatistics } from "../services/bahn";
import { Request, Response } from "express";
import { Connection, Station, TrainType } from "../models/outbound/bahn";
import { validateBody } from "../util/validation";
import * as Cache from 'memory-cache';



export async function getAllStationsController(req: Request, res: Response) {
    try{
        const stations = await getAllStations();
        res.json(stations);
    }
    catch(err){
        res.status(500).send(err);
    }   
}

export async function getStationController(req: Request, res: Response) {
    try{
        const body = req.body;
        let validation = validateBody(body, {trainType: false, trainNumber: false, date: false, stationName: true, ds100: false, eva: false});
        if(!validation){
            res.json(await getStationByName(body.stationName));
            return;
        }
        validation = validateBody(body, {trainType: false, trainNumber: false, date: false, stationName: false, ds100: true, eva: false});
        if(!validation){
            res.json(await getStationByDs100(body.ds100));
            return;
        }
        validation = validateBody(body, {trainType: false, trainNumber: false, date: false, stationName: false, ds100: false, eva: true});
        if(!validation){
            res.json(await getStationByEva(body.eva));
            return;
        }
        res.status(400).send("Bad Request -- Unique identifier is missing");
    }
    catch(err){
        res.status(500).send(err);
    }   
}

export async function getStatisticsController(req: Request, res: Response) {
    try{
        const statistics = await getStatistics();
        res.json(statistics);
    }
    catch(err){
        res.status(500).send(err);
    }   
}

export async function getDatesOfJourneyController(req: Request, res: Response) {
    try{
        const body = req.body;
        const validation = validateBody(body, {trainType: true, trainNumber: true, date: false, stationName: false, ds100: false, eva: false});
        if(validation){
            res.status(400).send(validation);
            return;
        }
        
        const dates = await getDatesOfJourney(body.trainType, body.trainNumber);

        res.json(dates);
    }
    catch(err){
        res.status(500).send(err);
    }   
}

export async function getJourneyController(req: Request, res: Response) {
    try{
        const body = req.body;
        const validation = validateBody(body, {trainType: true, trainNumber: true, date: true, stationName: false, ds100: false, eva: false});
        if(validation){
            res.status(400).send(validation);
            return;
        }
        let journey = null;
        if(!body.station){
            journey = await getJourney(body.trainType, body.trainNumber, new Date(body.date));
        }
        else{
            journey = await getJourneyStationReference(body.trainType, body.trainNumber, new Date(body.date), body.station);
        }

        if(journey === null){
            res.status(404).send("Not Found -- Journey not found");
            return;
        }

        res.json(journey);
    }
    catch(err){
        res.status(500).send(err);
    }
}

export async function getJourneysOfStationController(req: Request, res: Response) {
    try{
        const body = req.body;
        const validation = validateBody(body, {trainType: false, trainNumber: false, date: true, stationName: false, ds100: true, eva: false});
        if(validation){
            res.status(400).send(validation);
            return;
        }
        const journeys = await getJourneyOfStationByDs100(body.ds100, new Date(body.date));

        res.json(journeys);
    }
    catch(err: Error | any){
        res.status(500).json({"error:": err.message});
    }
}

export async function getStationConnectionsController(req: Request, res: Response) {
    try{
        const body = req.body;
        const validation = validateBody(body, {trainType: false, trainNumber: false, date: false, stationName: false, ds100: true, eva: false});
        if(validation){
            res.status(400).send(validation);
            return;
        }
        const stations = await getStationConnections(body.ds100);

        res.json(stations);
    }
    catch(err: Error | any){
        res.status(500).json({"error:": err.message});
    }
}

export async function getAllConnectionsController(req: Request, res: Response) {
    try{
        const connections = JSON.parse(Cache.get('connections') as string) as Connection[];
        const connStatus = Cache.get('connStatus') as string;

        if(connections === null){
            res.status(404).send("Not Found -- " + connStatus);
            return;
        }

        res.json(connections);
    }
    catch(err: Error | any){
        res.status(500).json({"error:": err.message});
    }
}