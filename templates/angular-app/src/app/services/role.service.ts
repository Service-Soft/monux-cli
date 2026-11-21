import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiRoute, RoleData } from '{{=contractPackage}}';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environment/environment';

/**
 * Reads the roles the logged in user can hand out, see the RoleController of the api.
 */
@Service()
export class RoleService {
    private readonly http: HttpClient = inject(HttpClient);

    private readonly baseUrl: string = `${environment.{{=apiPrefix}}_base_url}/${ApiRoute.ROLES}`;

    /**
     * Resolves the roles of a level: the tenant roles the tenant the user acts in sees, or the platform roles.
     * @param level - Whether the roles are held through a membership or by the user themselves.
     * @returns The roles, by name.
     */
    async resolveRoles(level: RoleData['level']): Promise<RoleData[]> {
        const roles: RoleData[] = await firstValueFrom(this.http.get<RoleData[]>(this.baseUrl));
        return roles.filter(role => role.level === level).sort((a, b) => a.name.localeCompare(b.name));
    }
}
