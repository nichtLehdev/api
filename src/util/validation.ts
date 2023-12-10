import { TrainType } from "../models/outbound/bahn";

type BodyParams = {
    trainType: boolean,
    trainNumber: boolean,
    date: boolean,
    stationName: boolean
    ds100: boolean
    eva: boolean
}

export function validateBody(body: any, params: BodyParams){
    if(!body){
        return "Bad Request -- Body is missing";
    }
    if(params.trainType && !body.trainType){
        return "Bad Request -- TrainType is missing";
    }
    if(params.trainNumber && !body.trainNumber){
        return "Bad Request -- TrainNumber is missing";
    }
    if(params.date && !body.date){
        return "Bad Request -- Date is missing";
    }
    if(params.stationName && !body.stationName){
        return "Bad Request -- Station-Name is missing";
    }
    if(params.ds100 && !body.ds100){
        return "Bad Request -- DS100 is missing";
    }
    if(params.eva && !body.eva){
        return "Bad Request -- EVA is missing";
    }
    if(params.trainNumber && isNaN(body.trainNumber)){
        return "Bad Request -- TrainNumber is not a number";
    }
    if(params.trainNumber && body.trainNumber < 0){
        return "Bad Request -- TrainNumber is negative";
    }
    if(params.trainType && body.trainType as TrainType === undefined){
        return "Bad Request -- TrainType is invalid";
    }
    if(params.date && isNaN(Date.parse(body.date))){
        return "Bad Request -- Date is invalid";
    }
    return null;
}