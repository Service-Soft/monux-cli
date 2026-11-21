import { BaseInvitationEntity, Entity, Property } from 'zibri';

// who the admin app invited: to the application, or to a tenant with roles there. One open invitation per email in
// each tenant. One with an expiresAt ends then, see the invitations docs
@Entity({ uniques: [['email']], expiresBy: 'expiresAt' })
export class Invitation extends BaseInvitationEntity() {
    // the name of the account the invitation creates, see the InvitationRepository
    @Property.string()
    name!: string;
}
