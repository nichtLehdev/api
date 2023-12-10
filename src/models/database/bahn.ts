import {v4 as uuidv4} from 'uuid';
import { TrainFlag, TrainType } from '../outbound/bahn';

export type Station = {
    id: number,
    eva: number,
    name: string,
    ds100: string,
    longitude: number | null,
    latitude: number | null,
    fetch_status: 'FETCH' | 'TOO_MANY_ERRORS'
}

export type Journey = {
    id: string,
    start: Date,
    train_number: number,
    train_type: TrainType,
    train_flag: TrainFlag,
    train_line: string | null,
}

export type StopDetail = {
    id: typeof uuidv4,
    type: 'ACTUAL' | 'PLANNED',
    arrival: Date | null,
    departure: Date | null,
    platform: string | null,
    status: 'PLANNED' | 'CANCELLED' | 'ADDITIONAL'
}

export type Stop = {
    id: string,
    journey_id: string,
    journey_start: Date,
    ordinal: number,
    station_eva: number,
    planned_details_id: typeof uuidv4,
    actual_details_id: typeof uuidv4 | null,
}

export enum MessageType {
    QUALITY_CHANGE = 0,
    FREE = 1,
    CAUSE_OF_DELAY = 2,
    DISRUPTION = 3,
    CONNECTION = 4,
    HIM = 5
}

export type StopMessage = {
    id: string,
    _from: Date,
    to: Date,
    ts: Date,
    stop_id: string,
    type: MessageType | null,
    code: number | null,
    _int: string | null,
    ext: string | null,
    cat: string | null,
    ec: number | null,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'DONE' | null,
    parent: 'STOP' | 'ARRIVAL' | 'DEPARTURE' | null,
}