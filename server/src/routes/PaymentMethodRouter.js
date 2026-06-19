import express from 'express';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import TeamMiddleware from '../middleware/TeamMiddleware.js';
import prisma from '../db/index.js';
import { PaymentMethodValidator } from '../validators/PaymentMethodValidator.js';

const PaymentMethodRouter = express.Router();
PaymentMethodRouter.use(AuthMiddleware);
PaymentMethodRouter.use(TeamMiddleware);

PaymentMethodRouter.get('/', async (req, res, next) => {
    try {
        const methods = await prisma.paymentMethod.findMany({
            where: { teamId: req.teamId },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ paymentMethods: methods });
    } catch (err) { next(err); }
});

PaymentMethodRouter.post('/', async (req, res, next) => {
    const result = PaymentMethodValidator.add.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });

    try {
        const method = await prisma.paymentMethod.create({
            data: { teamId: req.teamId, userId: req.userId, ...result.data, logoUrl: result.data.logoUrl || null },
        });
        res.status(201).json({ message: 'Payment method created', paymentMethod: method });
    } catch (err) { next(err); }
});

PaymentMethodRouter.patch('/:id', async (req, res, next) => {
    const { id } = req.params;
    const result = PaymentMethodValidator.update.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });

    try {
        const existing = await prisma.paymentMethod.findFirst({ where: { id, teamId: req.teamId } });
        if (!existing) return res.status(404).json({ message: 'Payment method not found' });

        const method = await prisma.paymentMethod.update({
            where: { id },
            data: { ...result.data, ...(result.data.logoUrl !== undefined && { logoUrl: result.data.logoUrl || null }) },
        });
        res.json({ message: 'Payment method updated', paymentMethod: method });
    } catch (err) { next(err); }
});

PaymentMethodRouter.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const deleted = await prisma.paymentMethod.deleteMany({ where: { id, teamId: req.teamId } });
        if (!deleted.count) return res.status(404).json({ message: 'Payment method not found' });
        res.json({ message: 'Payment method deleted' });
    } catch (err) { next(err); }
});

export default PaymentMethodRouter;
