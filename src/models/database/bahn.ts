import {v4 as uuidv4} from 'uuid';

export type Station = {
    id: number,
    eva: number,
    name: string,
    ds100: string,
    longitude: number | null,
    latitude: number | null,
    fetch_status: 'FETCH' | 'TOO_MANY_ERRORS'
}

enum TrainFlag{
    UNKNOWN = 0,
    F = 1,
    N = 2,
    D = 3,
    S = 4
}

enum TrainType {
    UNKNOWN = 0,
    AG = 1,
    AKN = 2,
    ALX = 3,
    AS = 4,
    AZS = 5,
    BE = 6,
    BRB = 7,
    BUS = 8,
    BZB = 9,
    CB = 10,
    CLR = 11,
    D = 12,
    DAB = 13,
    DWE = 14,
    EC = 15,
    ECE = 16,
    EN = 17,
    ENO = 18,
    ERX = 19,
    ES = 20,
    EVB = 21,
    EX = 22,
    FEX = 23,
    FLX = 24,
    HLB = 25,
    HSB = 26,
    IC = 27,
    ICE = 28,
    IR = 29,
    IRE = 30,
    KD = 31,
    MBB = 32,
    ME = 33,
    MEX = 34,
    N = 35,
    NBE = 36,
    NEG = 37,
    NJ = 38,
    NWB = 39,
    OPB = 40,
    OS = 41,
    P = 42,
    PRE = 43,
    R = 44,
    RB = 45,
    RE = 46,
    REX = 47,
    RJ = 48,
    RJX = 49,
    RRB = 50,
    RT = 51,
    RTB = 52,
    S = 53,
    SAB = 54,
    SBB = 55,
    SDG = 56,
    SOE = 57,
    STB = 58,
    STN = 59,
    SWE = 60,
    TGV = 61,
    THA = 62,
    TL = 63,
    TLX = 64,
    TRI = 65,
    UEX = 66,
    VBG = 67,
    VEN = 68,
    VIA = 69,
    WB = 70,
    WBA = 71,
    WEG = 72,
    WFB = 73,
    EST = 74
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
    status: 'PLANNED' | 'CANCELLED' | 'ADDITONAL' | 'UNKNOWN'
}

export type stop = {
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