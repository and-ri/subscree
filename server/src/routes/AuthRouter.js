import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignJWT } from 'jose';
import prisma from '../db/index.js';
import { sendEmail } from '../services/emailService.js';

const AuthRouter = express.Router();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function appUrl() {
    return process.env.APP_URL || process.env.ORIGIN_URL || 'http://localhost:3001';
}

const registerSchema = z.object({
    email:       z.email('Invalid email address'),
    name:        z.string().min(1, 'Name is required').max(100),
    password:    z.string().min(8, 'Password must be at least 8 characters'),
    inviteToken: z.string().optional(),
});

const loginSchema = z.object({
    email:    z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
    email: z.email('Invalid email address'),
});

const resetPasswordSchema = z.object({
    token:    z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

function safeUser(user) {
    return { id: user.id, email: user.email, name: user.name, preferredCurrency: user.preferredCurrency };
}

AuthRouter.post('/register', async (req, res, next) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { email, name, password, inviteToken } = result.data;
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
        // Resolve a valid invitation up front (if one was supplied). A bad or
        // mismatched token is ignored — the user simply gets a personal team.
        let invitation = null;
        if (inviteToken) {
            invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash: hashToken(inviteToken) } });
            if (invitation && (invitation.expiresAt < new Date() ||
                invitation.email.toLowerCase() !== email.toLowerCase())) {
                invitation = null;
            }
        }

        const user = await prisma.user.create({ data: { email, name, passwordHash } });

        if (invitation) {
            await prisma.$transaction([
                prisma.teamMember.create({ data: { teamId: invitation.teamId, userId: user.id, role: invitation.role } }),
                prisma.teamInvitation.delete({ where: { id: invitation.id } }),
                prisma.user.update({ where: { id: user.id }, data: { activeTeamId: invitation.teamId } }),
            ]);
        } else {
            // Every user needs a team — create a personal one they own.
            const team = await prisma.team.create({
                data: { name: `${name}'s Team`, members: { create: { userId: user.id, role: 'OWNER' } } },
            });
            await prisma.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } });
        }

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

// Public: look up a pending invitation by token (for the invite/register UI).
AuthRouter.get('/invitation/:token', async (req, res, next) => {
    try {
        const invitation = await prisma.teamInvitation.findUnique({
            where:   { tokenHash: hashToken(req.params.token) },
            include: { team: { select: { name: true } } },
        });
        if (!invitation || invitation.expiresAt < new Date()) {
            return res.status(404).json({ message: 'Invalid or expired invitation' });
        }
        res.json({ email: invitation.email, teamName: invitation.team.name });
    } catch (err) { next(err); }
});

AuthRouter.post('/forgot-password', async (req, res, next) => {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { email } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Always respond the same way so the endpoint can't be used to probe
        // which emails are registered.
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetTokenHash:      hashToken(token),
                    resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
                },
            });

            const link = `${appUrl()}/reset-password?token=${token}`;
            try {
                await sendEmail({
                    to:      user.email,
                    subject: 'Reset your Nook password',
                    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
                        <h2 style="font-size:18px">Reset your password</h2>
                        <p style="font-size:14px;line-height:1.6">We received a request to reset your password. This link expires in 1 hour.</p>
                        <p><a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px">Reset password</a></p>
                        <p style="font-size:12px;color:#9ca3af">If you didn't request this, you can safely ignore this email.</p>
                    </div>`,
                    text: `Reset your password (expires in 1 hour): ${link}`,
                });
            } catch (err) {
                console.error('[auth] reset email failed:', err.message);
            }
        }

        res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    } catch (error) {
        return next(error);
    }
});

AuthRouter.post('/reset-password', async (req, res, next) => {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    const { token, password } = result.data;

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetTokenHash:      hashToken(token),
                resetTokenExpiresAt: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash:        bcrypt.hashSync(password, 10),
                resetTokenHash:      null,
                resetTokenExpiresAt: null,
            },
        });

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        return next(error);
    }
});

export default AuthRouter;
