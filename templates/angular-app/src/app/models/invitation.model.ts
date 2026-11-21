import { Property } from '@service-soft/ngx-entity/entity';
import { InvitationData } from '{{=contractPackage}}';

/**
 * An open invitation, as the admin app lists it. It is sent with the dialog of the users page, see
 * InvitationDialogComponent, and the api never changes it.
 */
export class Invitation implements InvitationData {
    @Property.string({ displayName: $localize`:@@invitation.id:Id`, format: 'uuid', readonly: true, display: false })
    id!: string;

    @Property.string({ displayName: $localize`:@@invitation.email:Email`, format: 'email' })
    email!: string;

    @Property.string({ displayName: $localize`:@@invitation.name:Name` })
    name!: string;

    @Property.array({ displayName: $localize`:@@invitation.roles:Roles`, items: { type: 'string' } })
    roles!: string[];

    @Property.string({ displayName: $localize`:@@invitation.tenantId:Tenant id`, format: 'uuid', required: false, display: false })
    tenantId?: string | null;

    // empty for an invitation to the application only
    @Property.string({ displayName: $localize`:@@invitation.tenantName:Tenant`, required: false })
    tenantName?: string | null;

    @Property.string({ displayName: $localize`:@@invitation.createOn:Account created`, enum: { invite: $localize`:@@invitation.createOn.invite:When invited`, accept: $localize`:@@invitation.createOn.accept:When accepted` } })
    createOn!: 'invite' | 'accept';

    @Property.boolean({ displayName: $localize`:@@invitation.declinable:Can be declined` })
    declinable!: boolean;

    @Property.string({ displayName: $localize`:@@invitation.invitedBy:Invited by`, format: 'uuid', display: false })
    invitedBy!: string;

    @Property.date({ displayName: $localize`:@@invitation.tokenExpiresAt:Link works until` })
    tokenExpiresAt!: Date;

    @Property.date({ displayName: $localize`:@@invitation.expiresAt:Ends`, required: false })
    expiresAt?: Date | null;

    @Property.string({ displayName: $localize`:@@invitation.createdUserId:Created account`, format: 'uuid', required: false, display: false })
    createdUserId?: string | null;
}
