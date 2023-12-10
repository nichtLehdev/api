import express from 'express';
import bahnRouter from './routes/bahn';
import bodyParser from 'body-parser';

const app = express();

app.use(bodyParser.json());

app.use('/bahn/v1/', bahnRouter);
// app.use

export default app;