import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import prisma from '../db/index.js';
import { CURRENCY_CODES } from '../constants/currencies.js';

const UserRouter = express.Router();
UserRouter.use(AuthMiddleware);

const profileSchema = z.object({
    name:              z.string().min(1, 'Name is required').max(100).optional(),
    preferredCurrency: z.enum(CURRENCY_CODES, { error: 'Invalid currency code' }).optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
});

function safeUser(user) {
    return { id: user.id, email: user.email, name: user.name, preferredCurrency: user.preferredCurrency };
}

UserRouter.get('/me', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user: safeUser(user) });
    } catch (err) {
        next(err);
    }
});

UserRouter.patch('/me', async (req, res, next) => {
    const result = profileSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    try {
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: result.data,
        });
        res.json({ message: 'Profile updated', user: safeUser(user) });
    } catch (err) {
        next(err);
    }
});

UserRouter.patch('/me/password', async (req, res, next) => {
    const result = passwordSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { currentPassword, newPassword } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const valid = bcrypt.compareSync(currentPassword, user.passwordHash);
        if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

        const passwordHash = bcrypt.hashSync(newPassword, 10);
        await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
});

export default UserRouter;
