import * as Cache from 'memory-cache';

export const cache = (duration: number) => {
    return (req: any, res: any, next: any) => {
        const key = '__express__' + req.originalUrl || req.url;
        const cachedBody = Cache.get(key);
        if (cachedBody) {
            res.send(cachedBody);
        } else {
            res.sendResponse = res.send;
            res.send = (body: any) => {
                Cache.put(key, body, duration * 1000);
                res.sendResponse(body);
            }
            next();
        }
    }
}