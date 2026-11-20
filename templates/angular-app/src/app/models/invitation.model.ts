import { Property } from '@service-soft/ngx-entity/entity';
import { InvitationData } from '{{=contractPackage}}';

/**
 * An open invitation, as the admin app lists it. It is sent with the dialog of the users page, see
 * InvitationDialogComponent, and the api never changes it.
 */
export class Invitation implements InvitationData {
    @Property.string({ displayName: 'Id', format: 'uuid', readonly: true, display: false })
    id!: string;

    @Property.string({ displayName: 'Email', format: 'email' })
    email!: string;

    @Property.string({ displayName: 'Name' })
    name!: string;

    @Property.array({ displayName: 'Roles', items: { type: 'string' } })
    roles!: string[];

    @Property.string({ displayName: 'Tenant id', format: 'uuid', required: false, display: false })
    tenantId?: string | null;

    // empty for an invitation to the application only
    @Property.string({ displayName: 'Tenant', required: false })
    tenantName?: string | null;

    @Property.string({ displayName: 'Account created', enum: { invite: 'When invited', accept: 'When accepted' } })
    createOn!: 'invite' | 'accept';

    @Property.boolean({ displayName: 'Can be declined' })
    declinable!: boolean;

    @Property.string({ displayName: 'Invited by', format: 'uuid', display: false })
    invitedBy!: string;

    @Property.date({ displayName: 'Link works until' })
    tokenExpiresAt!: Date;

    @Property.date({ displayName: 'Ends', required: false })
    expiresAt?: Date | null;

    @Property.string({ displayName: 'Created account', format: 'uuid', required: false, display: false })
    createdUserId?: string | null;
}
