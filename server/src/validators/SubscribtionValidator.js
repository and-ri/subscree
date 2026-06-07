import { z } from 'zod';
import { CURRENCY_CODES } from '../constants/currencies.js';

const schemaAdd = z.object({
    name:            z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    amount:          z.number({ invalid_type_error: 'Amount must be a number' }).nonnegative('Amount must be non-negative'),
    currency:        z.enum(CURRENCY_CODES, { error: `Currency must be one of: ${CURRENCY_CODES.join(', ')}` }),
    billingCycle:    z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], { error: 'Billing cycle must be one of DAILY, WEEKLY, MONTHLY, YEARLY' }),
    status:          z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'TRIAL'], { error: 'Status must be one of ACTIVE, PAUSED, CANCELLED, TRIAL' }),
    url:             z.url('URL must be a valid URL').optional().or(z.literal('')),
    logoUrl:         z.url('Logo URL must be a valid URL').optional().or(z.literal('')),
    startDate:       z.coerce.date({ error: 'Start date must be a valid date' }).optional(),
    nextBillingDate: z.coerce.date({ error: 'Next billing date must be a valid date' }).optional(),
    cancelledAt:     z.coerce.date({ error: 'Cancelled at must be a valid date' }).optional(),
    notes:           z.string().max(500, 'Notes must be less than 500 characters').optional(),
    categories:      z.array(z.string().uuid('Each category ID must be a valid UUID')).optional(),
});

const schemaUpdate = schemaAdd.partial();

export const SubscribtionValidator = { add: schemaAdd, update: schemaUpdate };
