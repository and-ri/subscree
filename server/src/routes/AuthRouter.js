import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT } from 'jose';
import prisma from '../db/index.js';

const AuthRouter = express.Router();

const registerSchema = z.object({
    email:    z.email('Invalid email address'),
    name:     z.string().min(1, 'Name is required').max(100),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
    email:    z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

function safeUser(user) {
    return { id: user.id, email: user.email, name: user.name, preferredCurrency: user.preferredCurrency };
}

AuthRouter.post('/register', async (req, res, next) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { email, name, password } = result.data;
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
        const user = await prisma.user.create({ data: { email, name, passwordHash } });
        res.status(201).json({ message: 'User registered successfully', user: safeUser(user) });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Email already in use' });
        }
        return next(error);
    }
});

AuthRouter.post('/login', async (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { email, password } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = await new SignJWT({ userId: user.id })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));

        res.json({ message: 'Login successful', user: safeUser(user), token });
    } catch (error) {
        return next(error);
    }
});

export default AuthRouter;
