import express from 'express';
import { CURRENCIES } from '../constants/currencies.js';

const CurrencyRouter = express.Router();

CurrencyRouter.get('/', (req, res) => {
    res.json({ currencies: CURRENCIES });
});

export default CurrencyRouter;
