import * as mariadb from 'mariadb';
import { BahnDbConfig } from '../config/bahn.db';
import { Station as DbStation, Journey, Stop, StopDetail } from '../models/database/bahn';
import { Station as ApiStation, Journey as ApiJourney, Stop as ApiStop, TrainType } from '../models/outbound/bahn';
import { v4 as uuidv4 } from 'uuid';

const pool = mariadb.createPool(BahnDbConfig);

function convertStation(station: DbStation): ApiStation {
    return {
        eva: station.eva,
        name: station.name,
        ds100: station.ds100,
        location: station.latitude && station.longitude ? {
            latitude: station.latitude,
            longitude: station.longitude
        } : null
    }
}

function convertStop(stop: Stop, planned: StopDetail, actual: StopDetail | null, station: ApiStation): ApiStop {
    let arrivalDelay = 0;
    let departureDelay = 0;

    if (planned.arrival && actual && actual.arrival) {
        // Calculate delay in minutes
        arrivalDelay = Math.round((actual.arrival.getTime() - planned.arrival.getTime()) / 1000);
        arrivalDelay = Math.round(arrivalDelay / 60);
    }

    if (planned.departure && actual && actual.departure) {
        departureDelay = Math.round((actual.departure.getTime() - planned.departure.getTime()) / 1000);
        departureDelay = Math.round(departureDelay / 60);
    }

    return {
        station: station,
        arrival: planned.arrival,
        arrivalDelay: planned.arrival ? arrivalDelay : null,
        departure: planned.departure,
        departureDelay: planned.departure ? departureDelay : null,
        platform: planned.platform,
        changedPlatform: actual ? actual.platform : null,
        ordinal: stop.ordinal,
        status: actual ? actual.status : 'PLANNED'
    }

}

async function convertStops(stops: Stop[]) {
    const apiStops: ApiStop[] = [];

    for (const stop of stops) {
        const station = await getStationByEva(stop.station_eva);
        if (!station) {
            continue;
        }

        const planned = await getStopDetails(stop.planned_details_id);
        if (!planned) {
            continue;
        }

        const actual = stop.actual_details_id ? await getStopDetails(stop.actual_details_id) : null;

        apiStops.push(convertStop(stop, planned, actual, station));
    }

    return apiStops;
}

export async function getAllStations() {

    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stations') as DbStation[];
    conn.release();

    const stations: ApiStation[] = [];

    for (const row of rows) {
        stations.push(convertStation(row));
    }

    return {
        "length": stations.length,
        "stations": stations
    }
}

export async function getStatistics() {
    const conn = await pool.getConnection();
    const stopCount = await conn.query('SELECT COUNT(*) AS count FROM stops') as { count: Number }[];
    const stationCount = await conn.query('SELECT COUNT(*) AS count FROM stations') as { count: number }[];
    const journeyCount = await conn.query('SELECT COUNT(*) AS count FROM journeys') as { count: number }[];
    const cancelledCount = await conn.query("SELECT COUNT(*) AS count from stop_details WHERE status = 'CANCELLED'") as { count: number }[];
    conn.release();

    return {
        "stopCount": Number(stopCount[0].count),
        "stationCount": Number(stationCount[0].count),
        "journeyCount": Number(journeyCount[0].count),
        "cancelledCount": Number(cancelledCount[0].count)
    }
}

export async function getStationByEva(eva: number) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stations WHERE eva = ?', [eva]) as DbStation[];
    conn.release();

    if (rows.length === 0) {
        throw new Error("Station not found");
    }

    return convertStation(rows[0]);
}

export async function getStationByName(name: string) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stations WHERE name like ?', [name + '%']) as DbStation[];
    conn.release();

    if (rows.length === 0) {
        throw new Error("Station not found");
    }

    const stations: ApiStation[] = [];

    for (const row of rows) {
        stations.push(convertStation(row));
    }

    return {
        "length": stations.length,
        "stations": stations
    }
}

export async function getStationByDs100(ds100: string) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stations WHERE ds100 = ?', [ds100]) as DbStation[];
    conn.release();

    if (rows.length === 0) {
        throw new Error("Station not found");
    }

    return convertStation(rows[0]);
}

async function getStopDetails(id: typeof uuidv4){
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stop_details WHERE id = ?', [id]) as StopDetail[];
    conn.release();

    if(rows.length === 0){
        throw new Error("StopDetail not found");
    }

    return rows[0];
}

async function getStopsOfJourney(id: string, start: Date){
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stops WHERE journey_id = ? AND journey_start = ? order by ordinal', [id, start]) as Stop[];
    conn.release();

    const stops = [];

    for(const row of rows){
        const stop: Stop = {
            "id": row.id,
            "journey_id": row.journey_id,
            "journey_start": row.journey_start,
            "ordinal": row.ordinal,
            "station_eva": row.station_eva,
            "planned_details_id": row.planned_details_id,
            "actual_details_id": row.actual_details_id
        }
        stops.push(stop);
    }

    return stops;
}

async function getMetadataOfJourney(id: string, start: Date){
    const conn = await pool.getConnection();
    // Get first and last stop
    // Get all stops of journey
    const rows = await conn.query('SELECT * FROM stops WHERE journey_id = ? AND journey_start = ? order by ordinal', [id, start]) as Stop[];
    conn.release();

    const firstStop = rows[0];
    const lastStop = rows[rows.length - 1];

    // check for every stop if it is cancelled
    const cancelled = [];
    for(const stop of rows){
        if(stop.actual_details_id === null){
            continue;
        }
        const details = await getStopDetails(stop.actual_details_id);
        if(details && details.status === 'CANCELLED'){
            cancelled.push(stop);
        }
    }

    const firstStation = await getStationByEva(firstStop.station_eva);
    const lastStation = await getStationByEva(lastStop.station_eva);

    return {
        "firstStation": firstStation,
        "lastStation": lastStation,
        "firstStop": firstStop,
        "lastStop": lastStop,
        "cancelledStops": cancelled
    }


}

export async function getDatesOfJourney(type: TrainType, number: number){
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM journeys WHERE train_type = ? AND train_number = ? order by start desc', [type, number]) as Journey[];
    conn.release();

    const meta = []

    for(const row of rows){
        const metadata = await getMetadataOfJourney(row.id, row.start);
        meta.push({
            "date": row.start,
            "origin": metadata.firstStation,
            "destination": metadata.lastStation,
            "stops": metadata.lastStop.ordinal
        })
    }

    return {
        "TrainType": type,
        "TrainNumber": number,
        "length": meta.length,
        "dates": meta
    }

}

export async function getJourney(type: TrainType, number: number, start: Date): Promise<ApiJourney | null>{
    const date = new Date(start);
    date.setHours(0,0,0,0);

    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM journeys WHERE train_type = ? AND train_number = ? AND start BETWEEN ? AND ? + interval 1 day - interval 1 second', [type, number, date, date]) as Journey[];
    conn.release();

    if(rows.length === 0){
        throw new Error("Journey not found");
    }

    // Get stops
    const stops = await getStopsOfJourney(rows[0].id, rows[0].start);
    
    // Convert stops
    const apiStops = await convertStops(stops);

    return {
        "start": rows[0].start,
        "type": rows[0].train_type,
        "number": rows[0].train_number,
        "line": rows[0].train_line,
        "origin": {
            "station": apiStops[0].station,
            "plannedTime": apiStops[0].departure
        },
        "destination": {
            "station": apiStops[apiStops.length - 1].station,
            "plannedTime": apiStops[apiStops.length - 1].arrival
        },
        "stops": apiStops
    }
}

/***
 * Gets the Journey of a train on a specific date
 * @param type The type of the train
 * @param number The number of the train
 * @param date The date of the journey at the reference station
 * @param referenceStationDs100 The ds100 code of the reference station
 */
export async function getJourneyStationReference(type: TrainType, number: number, date: Date, referenceStationDs100: string){

    const journey = await getJourney(type, number, date);

    if(!journey){
        throw new Error("Journey not found");
    }

    // Get reference station
    const referenceStation = await getStationByDs100(referenceStationDs100);

    if(!referenceStation){
        throw new Error("Reference Station not found");
    }

    // Check if reference station is in journey
    let referenceStop: ApiStop | null = null;
    for(const stop of journey.stops){
        if(stop.station.ds100 === referenceStation.ds100){
            referenceStop = stop;
            break;
        }
    }

    if(!referenceStop){
        throw new Error("Reference Station not in Journey");
    }



    // Check if Journey Start is on the same day as the arrival or the departure of the reference station
    const journeyStart = new Date(journey.start);
    journeyStart.setHours(0,0,0,0);

    if(referenceStop.arrival){
        const arrival = new Date(referenceStop.arrival);
        arrival.setHours(0,0,0,0);
        if(arrival.getTime() !== journeyStart.getTime()){
            // get journey of arrival day
            const journeyArrivalDay = await getJourney(type, number, arrival);
            if(!journeyArrivalDay){
                throw new Error("Journey not found");
            }

            return journeyArrivalDay;
        }
    }
    else if(referenceStop.departure){
        const departure = new Date(referenceStop.departure);
        departure.setHours(0,0,0,0);
        if(departure.getTime() !== journeyStart.getTime()){
            // get journey of departure day
            const journeyDepartureDay = await getJourney(type, number, departure);
            if(!journeyDepartureDay){
                throw new Error("Journey not found");
            }

            return journeyDepartureDay;
        }
    }
    else{
        throw new Error("Reference Stop has no arrival or departure");
    }

}