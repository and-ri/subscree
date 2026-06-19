import express from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import prisma from '../db/index.js';
import { sendEmail } from '../services/emailService.js';

const TeamRouter = express.Router();
TeamRouter.use(AuthMiddleware);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const createTeamSchema = z.object({ name: z.string().min(1, 'Name is required').max(100) });
const renameTeamSchema = z.object({ name: z.string().min(1, 'Name is required').max(100) });
const inviteSchema     = z.object({
    email: z.email('Invalid email address'),
    role:  z.enum(['OWNER', 'MEMBER']).optional(),
});
const acceptSchema = z.object({ token: z.string().min(1, 'Token is required') });

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
function appUrl() {
    return process.env.APP_URL || process.env.ORIGIN_URL || 'http://localhost:3001';
}

async function getMembership(teamId, userId) {
    return prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
        select: { id: true, role: true },
    });
}

// --- Teams -----------------------------------------------------------------

// List teams the caller belongs to.
TeamRouter.get('/', async (req, res, next) => {
    try {
        const [user, memberships] = await Promise.all([
            prisma.user.findUnique({ where: { id: req.userId }, select: { activeTeamId: true } }),
            prisma.teamMember.findMany({
                where:   { userId: req.userId },
                include: { team: { include: { _count: { select: { members: true } } } } },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const teams = memberships.map(m => ({
            id:          m.team.id,
            name:        m.team.name,
            role:        m.role,
            memberCount: m.team._count.members,
            isActive:    m.teamId === user?.activeTeamId,
        }));

        res.json({ teams, activeTeamId: user?.activeTeamId ?? null });
    } catch (err) { next(err); }
});

// Create a new team; caller becomes OWNER and it becomes their active team.
TeamRouter.post('/', async (req, res, next) => {
    const result = createTeamSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });

    try {
        const team = await prisma.team.create({
            data: {
                name:    result.data.name,
                members: { create: { userId: req.userId, role: 'OWNER' } },
            },
        });
        await prisma.user.update({ where: { id: req.userId }, data: { activeTeamId: team.id } });
        res.status(201).json({ team: { ...team, role: 'OWNER', memberCount: 1, isActive: true } });
    } catch (err) { next(err); }
});

// Switch active team (must be a member).
TeamRouter.post('/:id/activate', async (req, res, next) => {
    const { id } = req.params;
    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(403).json({ message: 'Not a member of this team' });

        await prisma.user.update({ where: { id: req.userId }, data: { activeTeamId: id } });
        res.json({ message: 'Active team switched', activeTeamId: id });
    } catch (err) { next(err); }
});

// Rename a team (OWNER only).
TeamRouter.patch('/:id', async (req, res, next) => {
    const { id } = req.params;
    const result = renameTeamSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });

    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });
        if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Only the owner can rename the team' });

        const team = await prisma.team.update({ where: { id }, data: { name: result.data.name } });
        res.json({ team });
    } catch (err) { next(err); }
});

// Delete a team (OWNER only). Cascades to members, invitations, and all data.
TeamRouter.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });
        if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Only the owner can delete the team' });

        await prisma.team.delete({ where: { id } });
        res.json({ message: 'Team deleted' });
    } catch (err) { next(err); }
});

// --- Members ---------------------------------------------------------------

TeamRouter.get('/:id/members', async (req, res, next) => {
    const { id } = req.params;
    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });

        const [members, invitations] = await Promise.all([
            prisma.teamMember.findMany({
                where:   { teamId: id },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'asc' },
            }),
            prisma.teamInvitation.findMany({
                where:   { teamId: id },
                select:  { id: true, email: true, role: true, expiresAt: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        res.json({
            role: membership.role,
            members: members.map(m => ({
                userId: m.userId, name: m.user.name, email: m.user.email,
                role: m.role, joinedAt: m.createdAt,
            })),
            invitations,
        });
    } catch (err) { next(err); }
});

// Remove a member (OWNER only). The last owner cannot be removed.
TeamRouter.delete('/:id/members/:userId', async (req, res, next) => {
    const { id, userId: targetUserId } = req.params;
    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });
        if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Only the owner can remove members' });

        const target = await getMembership(id, targetUserId);
        if (!target) return res.status(404).json({ message: 'Member not found' });

        if (target.role === 'OWNER') {
            const ownerCount = await prisma.teamMember.count({ where: { teamId: id, role: 'OWNER' } });
            if (ownerCount <= 1) return res.status(400).json({ message: 'Cannot remove the last owner' });
        }

        await prisma.teamMember.delete({ where: { teamId_userId: { teamId: id, userId: targetUserId } } });
        res.json({ message: 'Member removed' });
    } catch (err) { next(err); }
});

// Leave a team. The last owner must delete or transfer ownership instead.
TeamRouter.post('/:id/leave', async (req, res, next) => {
    const { id } = req.params;
    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });

        if (membership.role === 'OWNER') {
            const ownerCount = await prisma.teamMember.count({ where: { teamId: id, role: 'OWNER' } });
            if (ownerCount <= 1) {
                return res.status(400).json({ message: 'The last owner cannot leave. Delete the team or assign another owner first.' });
            }
        }

        await prisma.teamMember.delete({ where: { teamId_userId: { teamId: id, userId: req.userId } } });
        res.json({ message: 'Left team' });
    } catch (err) { next(err); }
});

// --- Invitations -----------------------------------------------------------

// Invite by email (OWNER only). Existing users are added immediately; unknown
// emails get a pending invitation with an emailed accept link.
TeamRouter.post('/:id/invitations', async (req, res, next) => {
    const { id } = req.params;
    const result = inviteSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });

    const email = result.data.email.toLowerCase();
    const role  = result.data.role ?? 'MEMBER';

    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });
        if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Only the owner can invite members' });

        const team = await prisma.team.findUnique({ where: { id }, select: { name: true } });
        const existingUser = await prisma.user.findUnique({ where: { email } });

        // Existing user → add as a member right away (no duplicate accounts).
        if (existingUser) {
            const already = await getMembership(id, existingUser.id);
            if (already) return res.status(409).json({ message: 'This user is already a member' });

            await prisma.teamMember.create({ data: { teamId: id, userId: existingUser.id, role } });

            sendEmail({
                to:      email,
                subject: `You've been added to ${team?.name ?? 'a team'} on Nook`,
                html:    `<p>You were added to the team <strong>${team?.name ?? ''}</strong> on Nook.</p>
                          <p><a href="${appUrl()}/dashboard">Open Nook</a></p>`,
                text:    `You were added to the team ${team?.name ?? ''} on Nook. ${appUrl()}/dashboard`,
            }).catch(err => console.error('[teams] add-notice email failed:', err.message));

            return res.status(201).json({ added: true, message: 'Member added' });
        }

        // Unknown email → pending invitation with token.
        const token = crypto.randomBytes(32).toString('hex');
        await prisma.teamInvitation.create({
            data: {
                teamId:      id,
                email,
                role,
                tokenHash:   hashToken(token),
                expiresAt:   new Date(Date.now() + INVITE_TTL_MS),
                invitedById: req.userId,
            },
        });

        const link = `${appUrl()}/invite?token=${token}`;
        sendEmail({
            to:      email,
            subject: `You're invited to join ${team?.name ?? 'a team'} on Nook`,
            html:    `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
                        <h2 style="font-size:18px">Join ${team?.name ?? 'a team'} on Nook</h2>
                        <p style="font-size:14px;line-height:1.6">You've been invited to collaborate on subscriptions. This link expires in 7 days.</p>
                        <p><a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px">Accept invitation</a></p>
                      </div>`,
            text:    `You're invited to join ${team?.name ?? 'a team'} on Nook (expires in 7 days): ${link}`,
        }).catch(err => console.error('[teams] invite email failed:', err.message));

        res.status(201).json({ invited: true, message: 'Invitation sent' });
    } catch (err) { next(err); }
});

// Revoke a pending invitation (OWNER only).
TeamRouter.delete('/:id/invitations/:invitationId', async (req, res, next) => {
    const { id, invitationId } = req.params;
    try {
        const membership = await getMembership(id, req.userId);
        if (!membership) return res.status(404).json({ message: 'Team not found' });
        if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Only the owner can revoke invitations' });

        const deleted = await prisma.teamInvitation.deleteMany({ where: { id: invitationId, teamId: id } });
        if (!deleted.count) return res.status(404).json({ message: 'Invitation not found' });
        res.json({ message: 'Invitation revoked' });
    } catch (err) { next(err); }
});

// Accept an invitation as the logged-in user (email must match the invite).
TeamRouter.post('/invitations/accept', async (req, res, next) => {
    const result = acceptSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues[0].message });

    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
        const invitation = await prisma.teamInvitation.findUnique({
            where: { tokenHash: hashToken(result.data.token) },
        });

        if (!invitation || invitation.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired invitation' });
        }
        if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
            return res.status(403).json({ message: 'This invitation was sent to a different email address' });
        }

        await prisma.$transaction([
            prisma.teamMember.upsert({
                where:  { teamId_userId: { teamId: invitation.teamId, userId: req.userId } },
                update: {},
                create: { teamId: invitation.teamId, userId: req.userId, role: invitation.role },
            }),
            prisma.teamInvitation.delete({ where: { id: invitation.id } }),
            prisma.user.update({ where: { id: req.userId }, data: { activeTeamId: invitation.teamId } }),
        ]);

        res.json({ message: 'Invitation accepted', teamId: invitation.teamId });
    } catch (err) { next(err); }
});

export default TeamRouter;
