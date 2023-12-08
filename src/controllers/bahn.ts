import { getAllStations } from "../services/bahn";
import { Request, Response } from "express";

export async function getAllStationsController(req: Request, res: Response) {
    try{
        const stations = await getAllStations();
        res.json(stations);
    }
    catch(err){
        res.status(500).send(err);
    }
    
}