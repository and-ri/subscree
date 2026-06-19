import prisma from '../db/index.js';

// Resolves the caller's active team and verifies membership, exposing
// req.teamId and req.teamRole. Must run after AuthMiddleware (needs req.userId).
// Auto-heals a stale/missing activeTeamId by falling back to any team the user
// still belongs to.
const TeamMiddleware = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where:  { id: req.userId },
            select: { activeTeamId: true },
        });
        if (!user) return res.status(401).json({ message: 'User not found' });

        let membership = null;

        if (user.activeTeamId) {
            membership = await prisma.teamMember.findUnique({
                where:  { teamId_userId: { teamId: user.activeTeamId, userId: req.userId } },
                select: { teamId: true, role: true },
            });
        }

        if (!membership) {
            membership = await prisma.teamMember.findFirst({
                where:   { userId: req.userId },
                select:  { teamId: true, role: true },
                orderBy: { createdAt: 'asc' },
            });
            if (membership) {
                await prisma.user.update({
                    where: { id: req.userId },
                    data:  { activeTeamId: membership.teamId },
                });
            }
        }

        if (!membership) {
            return res.status(403).json({ message: 'No active team. Create or join a team first.' });
        }

        req.teamId   = membership.teamId;
        req.teamRole = membership.role;
        next();
    } catch (err) { next(err); }
};

export default TeamMiddleware;
