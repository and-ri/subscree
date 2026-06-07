import express from 'express';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import prisma from '../db/index.js';
import { SubscribtionValidator } from '../validators/SubscribtionValidator.js';
import { convert, toMonthly } from '../services/currencyService.js';

const SubscribtionRouter = express.Router();

SubscribtionRouter.use(AuthMiddleware);

SubscribtionRouter.get('/', async (req, res, next) => {
    const { userId } = req;
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    try {
        const subscriptions = await prisma.subscription.findMany({
            where: { userId, ...(status && { status }) },
            include: { categories: true },
            skip,
            take: limit,
        });

        res.json({ subscriptions });
    } catch (error) {
        return next(error);
    }
});

SubscribtionRouter.post('/', async (req, res, next) => {
    const result = SubscribtionValidator.add.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { name, url, logoUrl, categories, amount, currency, billingCycle, status, startDate, nextBillingDate, cancelledAt, notes } = result.data;

    try {
        const subscription = await prisma.subscription.create({
            data: {
                userId: req.userId,
                name,
                url: url || null,
                logoUrl: logoUrl || null,
                amount,
                currency,
                billingCycle,
                status,
                startDate,
                nextBillingDate,
                cancelledAt,
                notes,
                categories: categories?.length ? {
                    connect: categories.map(categoryId => ({ id: categoryId }))
                } : undefined,
            },
        });

        res.status(201).json({ message: 'Subscription created successfully', subscription });
    } catch (error) {
        return next(error);
    }
});

SubscribtionRouter.get('/stats', async (req, res, next) => {
    const { userId } = req;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const targetCurrency = user?.preferredCurrency ?? 'USD';

        const [activeSubscriptions, subscriptionsByStatus, upcomingRenewals] = await prisma.$transaction([
            prisma.subscription.findMany({
                where: { userId, status: 'ACTIVE' },
                select: { amount: true, currency: true, billingCycle: true },
            }),
            prisma.subscription.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true },
            }),
            prisma.subscription.findMany({
                where: {
                    userId,
                    status: 'ACTIVE',
                    nextBillingDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                },
                orderBy: { nextBillingDate: 'asc' },
            }),
        ]);

        // Convert each active subscription to monthly equivalent in target currency
        const monthlyAmounts = await Promise.all(
            activeSubscriptions.map(async (sub) => {
                const monthly = toMonthly(sub.amount, sub.billingCycle);
                const converted = await convert(monthly, sub.currency, targetCurrency);
                return converted ?? 0;
            })
        );

        const totalMonthlySpend = monthlyAmounts.reduce((sum, v) => sum + v, 0);

        res.json({
            totalSubscriptions: activeSubscriptions.length,
            totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
            currency: targetCurrency,
            subscriptionsByStatus: subscriptionsByStatus.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {}),
            upcomingRenewals,
        });
    } catch (error) {
        return next(error);
    }
});

SubscribtionRouter.get('/:id', async (req, res, next) => {
    const { id } = req.params;
    const { userId } = req;

    try {
        const subscription = await prisma.subscription.findFirst({
            where: { id, userId },
            include: { categories: true },
        });

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        res.json({ subscription });
    } catch (error) {
        return next(error);
    }
});

SubscribtionRouter.patch('/:id', async (req, res, next) => {
    const { id } = req.params;
    const { userId } = req;
    const result = SubscribtionValidator.update.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { name, url, logoUrl, categories, amount, currency, billingCycle, status, startDate, nextBillingDate, cancelledAt, notes } = result.data;

    try {
        const subscription = await prisma.subscription.findFirst({ where: { id, userId } });

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(url !== undefined && { url: url || null }),
                ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
                ...(amount !== undefined && { amount }),
                ...(currency !== undefined && { currency }),
                ...(billingCycle !== undefined && { billingCycle }),
                ...(status !== undefined && { status }),
                ...(startDate !== undefined && { startDate }),
                ...(nextBillingDate !== undefined && { nextBillingDate }),
                ...(cancelledAt !== undefined && { cancelledAt }),
                ...(notes !== undefined && { notes }),
                ...(categories ? {
                    categories: {
                        set: categories.map(categoryId => ({ id: categoryId }))
                    }
                } : undefined),
            },
            include: { categories: true },
        });

        res.json({ message: 'Subscription updated successfully', subscription: updatedSubscription });
    } catch (error) {
        return next(error);
    }
});

SubscribtionRouter.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    const { userId } = req;

    try {
        const subscription = await prisma.subscription.findFirst({ where: { id, userId } });

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        await prisma.subscription.delete({ where: { id } });

        res.json({ message: 'Subscription deleted successfully' });
    } catch (error) {
        return next(error);
    }
});

export default SubscribtionRouter;
