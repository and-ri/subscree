import express from 'express';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import TeamMiddleware from '../middleware/TeamMiddleware.js';
import prisma from '../db/index.js';
import { CategoryValidator } from '../validators/CategoryValidator.js';

const CategoryRouter = express.Router();

CategoryRouter.use(AuthMiddleware);
CategoryRouter.use(TeamMiddleware);

CategoryRouter.get('/', async (req, res, next) => {
    const { teamId } = req;

    try {
        const categories = await prisma.category.findMany({
            where: { teamId },
        });

        res.json({ categories });
    } catch (error) {
        return next(error);
    }
});

CategoryRouter.post('/', async (req, res, next) => {
    const result = CategoryValidator.add.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { name } = result.data;

    try {
        const existingCategory = await prisma.category.findFirst({
            where: { name, teamId: req.teamId },
        });

        if (existingCategory) {
            return res.status(409).json({ message: 'Category with this name already exists' });
        }

        const category = await prisma.category.create({
            data: {
                teamId: req.teamId,
                userId: req.userId,
                name,
            },
        });

        res.status(201).json({ message: 'Category created successfully', category });
    } catch (error) {
        return next(error);
    }
});

CategoryRouter.patch('/:id', async (req, res, next) => {
    const { id } = req.params;
    const result = CategoryValidator.update.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { name } = result.data;

    try {
        const existingCategory = await prisma.category.findFirst({
            where: { name, teamId: req.teamId, id: { not: id } },
        });

        if (existingCategory) {
            return res.status(409).json({ message: 'Category with this name already exists' });
        }

        const category = await prisma.category.updateMany({
            where: { id, teamId: req.teamId },
            data: { name },
        });

        if (category.count === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        return next(error);
    }
});

CategoryRouter.delete('/:id', async (req, res, next) => {
    const { id } = req.params;

    try {
        const category = await prisma.category.deleteMany({
            where: { id, teamId: req.teamId },
        });

        if (category.count === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        return next(error);
    }
});

export default CategoryRouter;