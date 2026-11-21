import { Service } from '@angular/core';
import { EntityClass } from '@service-soft/ngx-entity/entity';
import { EntityService } from '@service-soft/ngx-entity/service';
import { ApiRoute, InvitationRequestData } from '{{=contractPackage}}';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environment/environment';
import { Invitation } from '../models/invitation.model';

/**
 * Sends, lists, sends again and revokes the invitations of the api, see its InvitationController. Revoking is the
 * delete of a row.
 */
@Service()
export class InvitationService extends EntityService<Invitation> {
    readonly entity: EntityClass<Invitation> = Invitation;
    readonly baseUrl: string = `${environment.{{=apiPrefix}}_base_url}/${ApiRoute.INVITATIONS}`;
    override readonly order: false = false;

    // what the sync dialog shows of a change made offline
    override getLabel(invitation: Partial<Invitation>): string {
        return invitation.email ?? $localize`:@@invitation.new:New invitation`;
    }

    /**
     * Invites somebody: to the tenant the user acts in, another one or the application only.
     * @param request - Who is invited, where, and when their account is created.
     * @returns The invitation.
     */
    async invite(request: InvitationRequestData): Promise<Invitation> {
        return await firstValueFrom(this.http.post<Invitation>(this.baseUrl, request));
    }

    /**
     * Mails an invitation again, with a new link. The one before stops working.
     * @param invitation - The invitation.
     */
    async resend(invitation: Invitation): Promise<void> {
        await firstValueFrom(this.http.post(`${this.baseUrl}/${invitation.id}/resend`, {}));
    }
}
