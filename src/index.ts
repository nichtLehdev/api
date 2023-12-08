import express from 'express';
import bahnRouter from './routes/bahn';

const app = express();

app.use('/bahn/v1/', bahnRouter);
// app.use

export default app;