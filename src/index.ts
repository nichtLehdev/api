import express from 'express';
import bahnRouter from './routes/bahn';

const app = express();

app.use('/api/bahn/v1/', bahnRouter);
// app.use

export default app;