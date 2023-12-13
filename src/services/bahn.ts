import * as mariadb from 'mariadb';
import { BahnDbConfig } from '../config/bahn.db';
import { Station as DbStation, Journey, Stop, StopDetail } from '../models/database/bahn';
import { Station as ApiStation, Journey as ApiJourney, Stop as ApiStop, TrainType, Connection } from '../models/outbound/bahn';
import { v4 as uuidv4 } from 'uuid';
import * as Cache from 'memory-cache';

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

async function getStopDetails(id: typeof uuidv4) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stop_details WHERE id = ?', [id]) as StopDetail[];
    conn.release();

    if (rows.length === 0) {
        throw new Error("StopDetail not found");
    }

    return rows[0];
}

async function getStopsOfJourney(id: string, start: Date) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stops WHERE journey_id = ? AND journey_start = ? order by ordinal', [id, start]) as Stop[];
    conn.release();

    const stops = [];

    for (const row of rows) {
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

async function getMetadataOfJourney(id: string, start: Date) {
    const conn = await pool.getConnection();
    // Get first and last stop
    // Get all stops of journey
    const rows = await conn.query('SELECT * FROM stops WHERE journey_id = ? AND journey_start = ? order by ordinal', [id, start]) as Stop[];
    conn.release();

    const firstStop = rows[0];
    const lastStop = rows[rows.length - 1];

    const firstStation = await getStationByEva(firstStop.station_eva);
    const lastStation = await getStationByEva(lastStop.station_eva);

    return {
        "firstStation": firstStation,
        "lastStation": lastStation,
        "firstStop": firstStop,
        "lastStop": lastStop,
    }


}

export async function getDatesOfJourney(type: TrainType, number: number) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM journeys WHERE train_type = ? AND train_number = ? order by start desc', [type, number]) as Journey[];
    conn.release();

    const meta = []

    for (const row of rows) {
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

async function getJourneyById(id: string, start: Date) {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM journeys WHERE id = ? AND start = ?', [id, start]) as Journey[];
    conn.release();

    if (rows.length === 0) {
        throw new Error("Journey not found");
    }

    return getJourney(rows[0].train_type, rows[0].train_number, rows[0].start);
}

export async function getJourney(type: TrainType, number: number, start: Date): Promise<ApiJourney | null> {
    const date = new Date(start);
    date.setHours(0, 0, 0, 0);

    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM journeys WHERE train_type = ? AND train_number = ? AND start BETWEEN ? AND ? + interval 1 day - interval 1 second', [type, number, date, date]) as Journey[];
    conn.release();

    if (rows.length === 0) {
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
export async function getJourneyStationReference(type: TrainType, number: number, date: Date, referenceStationDs100: string) {

    const journey = await getJourney(type, number, date);

    if (!journey) {
        throw new Error("Journey not found");
    }

    // Get reference station
    const referenceStation = await getStationByDs100(referenceStationDs100);

    if (!referenceStation) {
        throw new Error("Reference Station not found");
    }

    // Check if reference station is in journey
    let referenceStop: ApiStop | null = null;
    for (const stop of journey.stops) {
        if (stop.station.ds100 === referenceStation.ds100) {
            referenceStop = stop;
            break;
        }
    }

    if (!referenceStop) {
        throw new Error("Reference Station not in Journey");
    }



    // Check if Journey Start is on the same day as the arrival or the departure of the reference station
    const journeyStart = new Date(journey.start);
    journeyStart.setHours(0, 0, 0, 0);

    if (referenceStop.arrival) {
        const arrival = new Date(referenceStop.arrival);
        arrival.setHours(0, 0, 0, 0);
        if (arrival.getTime() !== journeyStart.getTime()) {
            // get journey of arrival day
            const journeyArrivalDay = await getJourney(type, number, arrival);
            if (!journeyArrivalDay) {
                throw new Error("Journey not found");
            }

            return journeyArrivalDay;
        }
    }
    else if (referenceStop.departure) {
        const departure = new Date(referenceStop.departure);
        departure.setHours(0, 0, 0, 0);
        if (departure.getTime() !== journeyStart.getTime()) {
            // get journey of departure day
            const journeyDepartureDay = await getJourney(type, number, departure);
            if (!journeyDepartureDay) {
                throw new Error("Journey not found");
            }

            return journeyDepartureDay;
        }
    }
    else {
        throw new Error("Reference Stop has no arrival or departure");
    }

}

async function getSmallMetadataOfJourney(j_id: string, start: Date) {
    const conn = await pool.getConnection();
    const journey = await conn.query('SELECT * FROM journeys WHERE id = ? AND start = ? order by start', [j_id, start]) as Journey[];
    const stops = await conn.query('SELECT * FROM stops WHERE journey_id = ? AND journey_start = ?', [j_id, start]) as Stop[];
    conn.release();

    const orderedStops = stops.sort((a, b) => a.ordinal - b.ordinal);

    const stations = JSON.parse(Cache.get("stations")) as ApiStation[];

    if (!stations) {
        throw new Error("Stations not found");
    }

    // Get origin and destination
    const origin = stations.find(s => s.eva === stops[0].station_eva);
    const destination = stations.find(s => s.eva === stops[stops.length - 1].station_eva);

    return {
        "type": journey[0].train_type,
        "number": journey[0].train_number,
        "line": journey[0].train_line,
        "origin": origin,
        "destination": destination,
        "stops": stops[stops.length - 1].ordinal
    }
}

export async function getJourneyOfStationByDs100(ds100: string, date: Date) {

    const station = await getStationByDs100(ds100);
    if (!station) {
        throw new Error("Station not found");
    }
    date.setHours(0, 0, 0, 0);

    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM stops WHERE station_eva = ? AND journey_start BETWEEN ? AND ? + INTERVAL 1 DAY - INTERVAL 1 SECOND', [station.eva, date, date]) as Stop[];
    conn.release();

    const journeys = [];

    for (const stop of rows) {
        const journey = await getSmallMetadataOfJourney(stop.journey_id, stop.journey_start);
        journeys.push(journey);
    }

    if (journeys.length === 0) {
        return {
            "station": station,
            "length": 0,
            "journeys": []
        }
    }

    return {
        "station": station,
        "length": journeys.length,
        "journeys": journeys
    }
}

type SmallStop = {
    journey_id: string,
    journey_start: Date,
    ordinal: number,
    station_eva: number,
    train_type: TrainType,
    train_number: number,
    planned_arrival: Date | null,
    planned_departure: Date | null,
    actual_arrival: Date | null,
    actual_departure: Date | null

}

async function getPreviousStop(stop: SmallStop): Promise<SmallStop | null> {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT s.journey_id, s.journey_start, s.ordinal, s.station_eva, j.train_type,  j.train_number, psd.arrival as planned_arrival, psd.departure as planned_departure, asd.arrival as actual_arrival, asd.departure as actual_departure FROM stops s INNER JOIN journeys j on s.journey_id = j.id AND s.journey_start = j.start INNER JOIN stop_details psd on s.planned_details_id = psd.id LEFT OUTER JOIN stop_details asd on s.actual_details_id = asd.id WHERE s.journey_id = ? AND s.journey_start = ? AND s.ordinal = ?',
     [stop.journey_id, stop.journey_start, stop.ordinal - 1]) as SmallStop[];
    conn.release();

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}

async function getNextStop(stop: SmallStop): Promise<SmallStop | null> {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT s.journey_id, s.journey_start, s.ordinal, s.station_eva, j.train_type, j.train_number, psd.arrival as planned_arrival, psd.departure as planned_departure, asd.arrival as actual_arrival, asd.departure as actual_departure FROM stops s INNER JOIN journeys j on s.journey_id = j.id AND s.journey_start = j.start INNER JOIN stop_details psd on s.planned_details_id = psd.id LEFT OUTER JOIN stop_details asd on s.actual_details_id = asd.id WHERE s.journey_id = ? AND s.journey_start = ? AND s.ordinal = ?',
        [stop.journey_id, stop.journey_start, stop.ordinal + 1]) as SmallStop[];
    conn.release();

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}

function getDistance(station1: ApiStation, station2: ApiStation) {
    if (!station1.location || !station2.location) {
        return null;
    }

    const lat1 = station1.location.latitude;
    const lon1 = station1.location.longitude;
    const lat2 = station2.location.latitude;
    const lon2 = station2.location.longitude;

    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres

    return d;
}

/**
 * Gets all connections from a station
 * Steps:
 * - Get station by ds100
 * - Get all stops of station
 * - For each stop:
 * - Get previous and next stop (if exists)
 * - Get Station of previous and next stop
 * - Add station to list
 */
export async function getStationConnections(ds100: string) {
    const station = await getStationByDs100(ds100);
    if (!station) {
        throw new Error("Station not found");
    }

    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT s.journey_id, s.journey_start, s.ordinal, s.station_eva, j.train_type, j.train_number, psd.arrival as planned_arrival, psd.departure as planned_departure, asd.arrival as actual_arrival, asd.departure as actual_departure FROM stops s INNER JOIN journeys j on s.journey_id = j.id AND s.journey_start = j.start INNER JOIN stop_details psd on s.planned_details_id = psd.id LEFT OUTER JOIN stop_details asd on s.actual_details_id = asd.id WHERE station_eva = ? AND journey_start BETWEEN ? AND ?',
        [station.eva, new Date('2023-12-10 00:00:00'), new Date('2023-12-11 23:59:59')]
    ) as SmallStop[];
    conn.release();

    const connectingStations: {
        station: ApiStation,
        averagePlannedTime: number,
        averageActualTime: number,
        usedStops: number,
        distance?: number
    }[] = [];

    for (const stop of rows) {
        // Get previous and next stop
        const prevStop = await getPreviousStop(stop);
        const nextStop = await getNextStop(stop);

        if (!prevStop && !nextStop) {
            continue;
        }

        // Get station of previous and next stop
        let prevStation: ApiStation | null = null;
        let nextStation: ApiStation | null = null;

        if (prevStop) {
            prevStation = await getStationByEva(prevStop.station_eva);
        }

        if (nextStop) {
            nextStation = await getStationByEva(nextStop.station_eva);
        }

        if (!prevStation && !nextStation) {
            continue;
        }

        if (prevStop !== null) {
            // Get Times between stations
            const plannedTime = Math.round((stop.planned_arrival!.getTime() - prevStop.planned_departure!.getTime()) / (1000 * 60));
            let actualTime = 0;
            if (stop.actual_arrival) {
                actualTime = stop.actual_arrival.getTime();
            }
            else {
                actualTime = stop.planned_arrival!.getTime();
            }
            if (prevStop.actual_departure) {
                actualTime -= prevStop.actual_departure.getTime()
            }
            else {
                actualTime -= prevStop.planned_departure!.getTime();
            }
            actualTime = Math.round(actualTime / (1000 * 60));

            // Check if station is already in list
            const index = connectingStations.findIndex(s => s.station.eva === prevStation!.eva);
            if (index === -1) {
                connectingStations.push({
                    "station": prevStation!,
                    "averagePlannedTime": plannedTime,
                    "averageActualTime": actualTime,
                    "usedStops": 1
                });
            }
            else {
                connectingStations[index].averagePlannedTime += plannedTime;
                connectingStations[index].averageActualTime += actualTime;
                connectingStations[index].usedStops++;
            }
        }

        if (nextStop !== null) {
            // Get Times between stations
            const plannedTime = Math.round(( nextStop.planned_arrival!.getTime() - stop.planned_departure!.getTime()) / (1000 * 60));
            let actualTime = 0;
            
            if(nextStop.actual_arrival){
                actualTime = nextStop.actual_arrival.getTime();
            }
            else{
                actualTime = nextStop.planned_arrival!.getTime();
            }
            if (stop.actual_departure) {
                actualTime -= stop.actual_departure.getTime()
            }
            else {
                actualTime -= stop.planned_departure!.getTime();
            }
            actualTime = Math.round(actualTime / (1000 * 60));

            // Check if station is already in list
            const index = connectingStations.findIndex(s => s.station.eva === nextStation!.eva);
            if (index === -1) {
                connectingStations.push({
                    "station": nextStation!,
                    "averagePlannedTime": plannedTime,
                    "averageActualTime": actualTime,
                    "usedStops": 1
                });
            }

            else {
                connectingStations[index].averagePlannedTime += plannedTime;
                connectingStations[index].averageActualTime += actualTime;
                connectingStations[index].usedStops++;
            }
        }
    }

    // Calculate average times and distances between stations
    for (const connStation of connectingStations) {
        connStation.averagePlannedTime = Math.round(connStation.averagePlannedTime / connStation.usedStops);
        connStation.averageActualTime = Math.round(connStation.averageActualTime / connStation.usedStops);

        // Get distance between stations based on coordinates
        const distance = getDistance(station, connStation.station);
        if (distance) {
            connStation.distance = parseFloat((distance / 1000).toFixed(2))
        }
    }

    return {
        "station": station,
        "usedStops": connectingStations.length,
        "connectingStations": connectingStations
    }
}

export async function getAllConnections(){
    // get all stations
    const stations = JSON.parse(Cache.get("stations")) as ApiStation[];

    if (!stations) {
        throw new Error("Stations not found");
    }

    const connections: Connection[] = [];

    let count = 0;

    for (const station of stations){
        count++;
        Cache.put("connStatus", `Processing station ${count}/${stations.length}`)
        const stationConns = await getStationConnections(station.ds100);
        for(const conn of stationConns.connectingStations){
            const index1 = connections.findIndex(c => c.station1.eva === station.eva && c.station2.eva === conn.station.eva);
            const index2 = connections.findIndex(c => c.station2.eva === station.eva && c.station1.eva === conn.station.eva);
            if(index1 === -1 && index2 === -1){
                connections.push({
                    "station1": station,
                    "station2": conn.station,
                    "averagePlannedTime": conn.averagePlannedTime,
                    "averageActualTime": conn.averageActualTime,
                    "usedStops": conn.usedStops,
                    "distance": conn.distance
                })
            }
            else if(index1 !== -1){
                connections[index1].averagePlannedTime += conn.averagePlannedTime;
                connections[index1].averageActualTime += conn.averageActualTime;
                connections[index1].usedStops += conn.usedStops;
                connections[index1].averagePlannedTime = Math.round(connections[index1].averagePlannedTime / 2);
                connections[index1].averageActualTime = Math.round(connections[index1].averageActualTime / 2);
            }
            else if(index2 !== -1){
                connections[index2].averagePlannedTime += conn.averagePlannedTime;
                connections[index2].averageActualTime += conn.averageActualTime;
                connections[index2].usedStops += conn.usedStops;
                connections[index2].averagePlannedTime = Math.round(connections[index2].averagePlannedTime / 2);
                connections[index2].averageActualTime = Math.round(connections[index2].averageActualTime / 2);
            }
            else{
                throw new Error("Something went wrong");
            }
        }
    }

    return {
        "length": connections.length,
        "connections": connections
    }
}