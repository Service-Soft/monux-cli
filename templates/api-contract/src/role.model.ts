/**
 * A role, as GET /roles answers it for the apps to offer: one held through a membership in a tenant, or one of the
 * user themselves.
 */
export type RoleData = {
    /**
     * The name of the role, which users and memberships hold.
     */
    name: string,
    /**
     * Whether a membership in a tenant holds it, or the user themselves.
     */
    level: 'tenant' | 'platform',
    /**
     * What the role is for.
     */
    description?: string | null
};
