import { ApiRoute, RoleData } from '{{=contractPackage}}';
import { Auth, Controller, CurrentUser, Get, inject, Property, Response, RoleLevel, RoleServiceInterface, ZIBRI_DI_TOKENS } from 'zibri';

import { Permissions, PlatformPermissions, Role, User } from '../models';

/**
 * A role, as the admin app offers it.
 */
export class RoleRow implements RoleData {
    @Property.string()
    name!: string;

    @Property.string({ enum: { tenant: 'tenant', platform: 'platform' } })
    level!: RoleLevel;

    @Property.string({ required: false })
    description?: string | null;
}

/**
 * The roles the admin app hands out, when it invites somebody and changes a membership. Who may hand out which is
 * checked by the RoleService of zibri, see the roles and permissions docs.
 */
@Controller(`/${ApiRoute.ROLES}`)
export class RoleController {
    private readonly roleService: RoleServiceInterface = inject(ZIBRI_DI_TOKENS.ROLE_SERVICE);

    // the tenant roles the tenant of the request sees, and the platform roles to a caller who may read every user
    @Auth.hasAnyLevelPermission({ permission: Permissions.MEMBERS_READ, platformPermission: PlatformPermissions.USERS_READ })
    @Response.array(RoleRow)
    @Get()
    async findAll(@CurrentUser() caller: CurrentUser<User>): Promise<RoleRow[]> {
        const mayReadEveryUser: boolean = caller.platformPermissions.includes(PlatformPermissions.USERS_READ);
        const roles: Role[] = await this.roleService.findRoles<Role>();
        return roles
            .filter(role => role.level === 'tenant' || mayReadEveryUser)
            .map(role => ({ name: role.name, level: role.level, description: role.description }));
    }
}
