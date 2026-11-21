import { BaseInvitationRepository, BaseUser, inject, RepositoryFor, RepositoryTransaction } from 'zibri';

import { UserRepository } from './user.repository';
import { Invitation, PlatformRoles } from '../models';

// the invitations, see the invitations docs. An invitation to an email without an account creates it here
@RepositoryFor(Invitation)
export class InvitationRepository extends BaseInvitationRepository<Invitation>() {
    override async createInvitedUser(invitation: Invitation, transaction: RepositoryTransaction | undefined): Promise<BaseUser<string>> {
        return await inject(UserRepository).create(
            { name: invitation.name, email: invitation.email, roles: [PlatformRoles.USER] },
            { transaction }
        );
    }
}
