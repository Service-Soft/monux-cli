import { Invitation } from 'zibri-contract';

/**
 * An open invitation, as GET /invitations answers it: what zibri keeps of it, the name of the invited person, and the
 * name of the tenant of an invitation to one.
 */
export type InvitationData = Invitation & {
    /**
     * The name of the invited person, which their account gets.
     */
    name: string,
    /**
     * The name of the tenant the invitation is to, or null for one to the application only.
     */
    tenantName?: string | null
};

/**
 * What POST /invitations takes: who is invited, with which roles, and when their account is created.
 */
export type InvitationRequestData = Pick<InvitationData, 'email' | 'name' | 'roles' | 'createOn' | 'declinable'> & {
    /**
     * The tenant to invite to. Without it, the tenant of the request, or the application only for a request naming
     * none. A tenant other than the one of the request needs the platform permission memberships.manage.
     */
    tenantId?: string
};
