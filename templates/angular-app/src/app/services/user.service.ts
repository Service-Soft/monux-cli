import { Service } from '@angular/core';
import { EntityClass } from '@service-soft/ngx-entity/entity';
import { EntityService } from '@service-soft/ngx-entity/service';
import { ApiRoute, USER_FILTER } from '{{=contractPackage}}';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environment/environment';
import { User } from '../models/user.model';

/**
 * What changes the membership of a user in a tenant: the roles they hold there, and whether it is deactivated.
 */
export type MembershipChange = {
    /**
     * The names of the tenant roles the user holds there.
     */
    roles?: string[],
    /**
     * Whether the membership is deactivated. A reactivated one keeps its roles.
     */
    deactivated?: boolean
};

/**
 * Reads and writes the users of the api, and their memberships, filtered by what its UserController allows, see the
 * contract library.
 */
@Service()
export class UserService extends EntityService<User, typeof USER_FILTER> {
    readonly entity: EntityClass<User> = User;
    readonly baseUrl: string = `${environment.{{=apiPrefix}}_base_url}/${ApiRoute.USERS}`;
    override readonly filter: typeof USER_FILTER = USER_FILTER;

    // what the sync dialog shows of a change made offline
    override getLabel(user: Partial<User>): string {
        return user.name ?? user.email ?? $localize`:@@user.new:New user`;
    }

    /**
     * Changes the membership of a user in a tenant: in the tenant the user acts in, or any with the platform permission
     * memberships.manage.
     * @param user - The user.
     * @param tenantId - The tenant of the membership.
     * @param change - What changes.
     * @returns The user as the api answers them now.
     */
    async updateMembership(user: User, tenantId: string, change: MembershipChange): Promise<User> {
        return await firstValueFrom(this.http.patch<User>(`${this.baseUrl}/${user.id}/memberships/${tenantId}`, change));
    }

    /**
     * Takes a user out of a tenant, with the roles they hold there.
     * @param user - The user.
     * @param tenantId - The tenant of the membership.
     */
    async deleteMembership(user: User, tenantId: string): Promise<void> {
        await firstValueFrom(this.http.delete(`${this.baseUrl}/${user.id}/memberships/${tenantId}`));
    }
}
