import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import AuthRouter from './routes/AuthRouter.js';
import CurrencyRouter from './routes/CurrencyRouter.js';
import SubscribtionRouter from './routes/SubscriptionRouter.js';
import CategoryRouter from './routes/CategoryRouter.js';
import UserRouter from './routes/UserRouter.js';
import ErrorMiddleware from './middleware/ErrorMiddleware.js';

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.ORIGIN_URL || 'http://localhost:3001' }));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/auth', AuthRouter);
app.use('/currencies', CurrencyRouter);
app.use('/users', UserRouter);
app.use('/subscriptions', SubscribtionRouter);
app.use('/categories', CategoryRouter);
app.use(ErrorMiddleware);

export default app;
