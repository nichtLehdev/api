export type Station = {
    eva: number,
    name: string,
    ds100: string,
    location: {
        longitude: number,
        latitude: number
    } | null,
}

export type TrainFlag = 'UNKNOWN' | 'F' | 'N' | 'D' | 'S'
export type TrainType = 'UNKNOWN' | 'AG' | 'AKN' | 'ALX' | 'AS' | 'AZS' | 'BE' | 'BRB' | 'BUS' | 'BZB' | 'CB' | 'CLR' | 'D' | 'DAB' | 'DWE' | 'EC' | 'ECE' | 'EN' | 'ENO' | 'ERX' | 'ES' | 'EVB' | 'EX' | 'FEX' | 'FLX' | 'HLB' | 'HSB' | 'IC' | 'ICE' | 'IR' | 'IRE' | 'KD' | 'MBB' | 'ME' | 'MEX' | 'N' | 'NBE' | 'NEG' | 'NJ' | 'NWB' | 'OPB' | 'OS' | 'P' | 'PRE' | 'R' | 'RB' | 'RE' | 'REX' | 'RJ' | 'RJX' | 'RRB' | 'RT' | 'RTB' | 'S' | 'SAB' | 'SBB' | 'SDG' | 'SOE' | 'STB' | 'STN' | 'SWE' | 'TGV' | 'THA' | 'TL' | 'TLX' | 'TRI' | 'UEX' | 'VBG' | 'VEN' | 'VIA' | 'WB' | 'WBA' | 'WEG' | 'WFB' | 'EST'

export type Stop = {
    station: Station,
    arrival: Date | null,
    arrivalDelay: number | null,
    departure: Date | null,
    departureDelay: number | null,
    platform: string | null,
    changedPlatform: string | null,
    ordinal: number,
    status: 'PLANNED' | 'CANCELLED' | 'ADDITIONAL'
}

export type Journey = {
    start: Date,
    type: TrainType,
    number: number,
    line: string | null,
    origin: {
        station: Station,
        plannedTime: Date | null,
    },
    destination: {
        station: Station,
        plannedTime: Date | null,
    },
    stops: Stop[]
}
