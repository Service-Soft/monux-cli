import { randomBytes } from 'node:crypto';

import { ApiRoute, ImportedUser, USER_FILTER } from '{{=contractPackage}}';
import { $ts, Auth, BadRequestError, Body, Controller, CurrentUser, DeepPartial, Delete, EntityRelations, File, FilterConfig, FilterUtilities, FilterValue, ForbiddenError, FormData, FsUtilities, Get, HttpStatus, inject, JsonUtilities, MembershipServiceInterface, MimeType, Newable, PaginationResult, Param, PasswordCredentials, PasswordCredentialsCreateData, Patch, Post, Property, Repository, repositoryTokenFor, ResetChangeSetResult, Response, RoleServiceInterface, TenantServiceInterface, Transaction, Where, ZIBRI_DI_TOKENS } from 'zibri';

import { Membership, MembershipCreateDto, MembershipUpdateDto, Permissions, PlatformPermissions, PlatformRoles, User, UserCreateDto, UserRow, UserUpdateDto } from '../models';
import { MembershipRepository, UserRepository } from '../repositories';
import { findTenantNames } from '../services/tenant-names.function';

// what the admin app shows of a user it opens: the user and every change that was made to them
const WITH_CHANGE_SETS: EntityRelations<User> = { changeSets: { changes: true } };

// what the list takes as its filter, checked against the rows once, at the start
const USER_FILTER_CLASS: Newable<object> = FilterUtilities.resolveFilterClass(USER_FILTER, UserRow);

// the part of the filter the users are read by. The tenant of a membership names the members, see findMemberIds
const ACCOUNT_FILTER: FilterConfig<User> = { email: USER_FILTER.email, name: USER_FILTER.name };

/**
 * The filter of the list, as the class of the USER_FILTER checked it.
 */
type UserFilter = FilterValue<UserRow, typeof USER_FILTER>;

/**
 * The change set a request undoes.
 */
export class ChangeSetRequestBody {
    @Property.string({ format: 'uuid' })
    changeSetId!: string;
}

/**
 * A user after one of their change sets was undone, with the values that changed.
 */
export class UserResetChangeSetResult {
    @Property.object({ cls: () => UserRow })
    entity!: UserRow;

    @Property.unknown()
    changedValues!: DeepPartial<User>;
}

/**
 * A file of users to create: a json array of objects with their name and email.
 */
export class UserImportData {
    @Property.file({ allowedMimeTypes: [MimeType.JSON], maxSize: '5mb' })
    import!: File;
}

/**
 * The users of the application, as the admin app manages them. Its administrators read every user and change their
 * accounts. The administrators of a tenant read its members, through the same routes, and change their memberships in
 * it. The rows are narrowed here rather than by a scope on the User, which zibri reads when somebody logs in too.
 */
@Controller(`/${ApiRoute.USERS}`)
export class UserController {
    private readonly userRepository: UserRepository = inject(UserRepository);

    private readonly membershipRepository: MembershipRepository = inject(MembershipRepository);

    private readonly credentialsRepository: Repository<PasswordCredentials, PasswordCredentialsCreateData>
        = inject(repositoryTokenFor(PasswordCredentials));

    private readonly tenantService: TenantServiceInterface = inject(ZIBRI_DI_TOKENS.TENANT_SERVICE);

    private readonly membershipService: MembershipServiceInterface = inject(ZIBRI_DI_TOKENS.MEMBERSHIP_SERVICE);

    private readonly roleService: RoleServiceInterface = inject(ZIBRI_DI_TOKENS.ROLE_SERVICE);

    // every user to a request naming no tenant, the members of the tenant of the request otherwise
    @Auth.hasAnyLevelPermission({ permission: Permissions.MEMBERS_READ, platformPermission: PlatformPermissions.USERS_READ })
    @Response.paginated(UserRow)
    @Get()
    async findAll(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.query('page', { type: 'number', format: 'integer', min: 1 })
        page: number,
        @Param.query('limit', { type: 'number', format: 'integer', min: 1, max: 100 })
        limit: number,
        @Param.query('filter', { type: 'object', cls: () => USER_FILTER_CLASS, required: false })
        filter?: UserFilter
    ): Promise<PaginationResult<UserRow>> {
        const memberTenantId: string | undefined = this.tenantService.getActiveTenantId() ?? filter?.memberships?.tenantId;
        const memberIds: string[] | undefined = memberTenantId == undefined ? undefined : await this.findMemberIds(memberTenantId);
        if (memberIds?.length === 0) {
            return { items: [], totalAmount: 0 };
        }
        const result: PaginationResult<User> = await this.userRepository.findAllPaginated(page, limit, {
            where: this.resolveWhere(filter, memberIds)
        });
        return { items: await this.resolveRows(result.items, caller), totalAmount: result.totalAmount };
    }

    @Auth.hasAnyLevelPermission({ permission: Permissions.MEMBERS_READ, platformPermission: PlatformPermissions.USERS_READ })
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(UserRow)
    @Get('/:id')
    async findById(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string
    ): Promise<UserRow> {
        const tenantId: string | undefined = this.tenantService.getActiveTenantId();
        if (tenantId != undefined) {
            // a user who is no member of the tenant of the request is not found, like a user who doesn't exist
            await this.membershipRepository.findOne({ where: { userId: id, tenantId }, acrossTenants: true });
        }
        if (caller.platformPermissions.includes(PlatformPermissions.USERS_READ)) {
            return await this.resolveRow(id, caller);
        }
        const [row] = await this.resolveRows([await this.userRepository.findById(id)], caller);
        return row;
    }

    @Auth.hasPlatformPermission(PlatformPermissions.USERS_CREATE)
    @Response.object(UserRow, { status: HttpStatus.CREATED })
    @Post()
    async create(@CurrentUser() caller: CurrentUser<User>, @Body(UserCreateDto) data: UserCreateDto): Promise<UserRow> {
        const user: User = await this.inTransaction(async transaction => await this.createWithPassword(data, data.password, transaction));
        return await this.resolveRow(user.id, caller);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.USERS_UPDATE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(UserRow)
    @Patch('/:id')
    async updateById(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Body(UserUpdateDto) data: UserUpdateDto
    ): Promise<UserRow> {
        await this.userRepository.updateById(id, data);
        return await this.resolveRow(id, caller);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.USERS_DELETE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.empty()
    @Delete('/:id')
    async deleteById(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<void> {
        await this.userRepository.deleteById(id);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.USERS_UPDATE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(UserResetChangeSetResult)
    @Post('/:id/reset')
    async resetChangeSet(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Body(ChangeSetRequestBody) body: ChangeSetRequestBody
    ): Promise<UserResetChangeSetResult> {
        const result: ResetChangeSetResult<User> = await this.userRepository.resetSingleChangeSetById(id, body.changeSetId);
        return { entity: await this.resolveRow(id, caller), changedValues: result.changedValues };
    }

    @Auth.hasPlatformPermission(PlatformPermissions.USERS_UPDATE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(UserRow)
    @Post('/:id/rollback')
    async rollbackToChangeSet(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Body(ChangeSetRequestBody) body: ChangeSetRequestBody
    ): Promise<UserRow> {
        await this.userRepository.rollbackToChangeSetById(id, body.changeSetId);
        return await this.resolveRow(id, caller);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.USERS_IMPORT)
    @Response.array(UserRow)
    @Post('/import')
    async importUsers(
        @CurrentUser() caller: CurrentUser<User>,
        @Body(UserImportData, { type: MimeType.FORM_DATA }) form: FormData<UserImportData>
    ): Promise<UserRow[]> {
        try {
            const importedUsers: ImportedUser[] = this.parseImportedUsers(await FsUtilities.readFile(form.value.import.path));
            const users: User[] = await this.inTransaction(async transaction => {
                const created: User[] = [];
                for (const importedUser of importedUsers) {
                    // a password nobody knows: an imported user sets their own with "forgot password"
                    const password: string = randomBytes(32).toString('base64url');
                    created.push(await this.createWithPassword(importedUser, password, transaction));
                }
                return created;
            });
            return await this.resolveRows(users, caller);
        }
        finally {
            await form.cleanup();
        }
    }

    // gives a user a membership in any tenant, such as for support adding somebody to a tenant right away. The
    // administrators of a tenant add people with an invitation instead, see invitation.controller.ts
    @Auth.hasPlatformPermission(PlatformPermissions.MEMBERSHIPS_MANAGE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(UserRow, { status: HttpStatus.CREATED })
    @Post('/:id/memberships')
    async createMembership(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Body(MembershipCreateDto) data: MembershipCreateDto
    ): Promise<UserRow> {
        await this.userRepository.findById(id);
        await this.inTransaction(async transaction => await this.tenantService.runAs(data.tenantId, async () => {
            await this.membershipService.resolveMembership(id, data.tenantId, transaction);
            for (const role of data.roles) {
                await this.roleService.assignRole(caller, id, role, transaction);
            }
        }));
        return await this.resolveRow(id, caller);
    }

    // changes the roles of a membership and deactivates or reactivates it: the administrators of a tenant in theirs
    @Auth.hasAnyLevelPermission({ permission: Permissions.MEMBERS_UPDATE, platformPermission: PlatformPermissions.MEMBERSHIPS_MANAGE })
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(UserRow)
    @Patch('/:id/memberships/:tenantId')
    async updateMembership(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Param.path('tenantId', { type: 'string', format: 'uuid' }) tenantId: string,
        @Body(MembershipUpdateDto) data: MembershipUpdateDto
    ): Promise<UserRow> {
        this.validateTenantOfPath(caller, tenantId);
        await this.inTransaction(async transaction => await this.tenantService.runAs(tenantId, async () => {
            const membership: Membership = await this.membershipRepository.findOne({ where: { userId: id }, transaction });
            if (data.roles != undefined) {
                await this.updateRoles(caller, membership, data.roles, transaction);
            }
            if (data.deactivatedAt !== undefined) {
                await this.membershipService.updateDeactivatedAt(id, tenantId, data.deactivatedAt, transaction);
            }
        }));
        return await this.findById(caller, id);
    }

    // takes somebody out of a tenant: their roles there first, checked like the RoleService checks taking a role away,
    // so nobody removes a member who holds more than they may take
    @Auth.hasAnyLevelPermission({ permission: Permissions.MEMBERS_REMOVE, platformPermission: PlatformPermissions.MEMBERSHIPS_MANAGE })
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.empty()
    @Delete('/:id/memberships/:tenantId')
    async deleteMembership(
        @CurrentUser() caller: CurrentUser<User>,
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Param.path('tenantId', { type: 'string', format: 'uuid' }) tenantId: string
    ): Promise<void> {
        this.validateTenantOfPath(caller, tenantId);
        await this.inTransaction(async transaction => await this.tenantService.runAs(tenantId, async () => {
            const membership: Membership = await this.membershipRepository.findOne({ where: { userId: id }, transaction });
            await this.updateRoles(caller, membership, [], transaction);
            await this.membershipService.deleteMembership(id, tenantId, transaction);
        }));
    }

    // the administrators of a tenant change the memberships of the tenant of their request only
    private validateTenantOfPath(caller: CurrentUser<User>, tenantId: string): void {
        if (
            tenantId.toLowerCase() !== this.tenantService.getActiveTenantId()
            && !caller.platformPermissions.includes(PlatformPermissions.MEMBERSHIPS_MANAGE)
        ) {
            throw new ForbiddenError(
                $ts`A membership of another tenant than the one of the request needs the permission to manage every membership.`
            );
        }
    }

    // through the RoleService, which checks what the caller may hand out and take away, in the active tenant
    private async updateRoles(caller: CurrentUser<User>, membership: Membership, roles: string[], transaction: Transaction): Promise<void> {
        for (const role of roles.filter(r => !membership.roles.includes(r))) {
            await this.roleService.assignRole(caller, membership.userId, role, transaction);
        }
        for (const role of membership.roles.filter(r => !roles.includes(r))) {
            await this.roleService.unassignRole(caller, membership.userId, role, transaction);
        }
    }

    // the members of a tenant, deactivated ones included, so that they can be reactivated
    private async findMemberIds(tenantId: string): Promise<string[]> {
        const memberships: Membership[] = await this.membershipRepository.findAll({
            where: { tenantId },
            limit: 'all',
            acrossTenants: true
        });
        return memberships.map(m => m.userId);
    }

    private resolveWhere(filter: UserFilter | undefined, memberIds: string[] | undefined): Where<User> | undefined {
        const where: Where<User> | undefined = filter == undefined
            ? undefined
            : FilterUtilities.resolveWhere(ACCOUNT_FILTER, User, filter);
        if (memberIds == undefined) {
            return where;
        }
        // a filter of several alternatives is narrowed to the members in each of them
        return where == undefined ? { id: memberIds } : [where].flat().map(w => ({ ...w, id: memberIds }));
    }

    // a user with every change made to them, for a caller who may read every user
    private async resolveRow(id: string, caller: CurrentUser<User>): Promise<UserRow> {
        const user: User = await this.userRepository.findById(id, { relations: WITH_CHANGE_SETS });
        const [row] = await this.resolveRows([user], caller);
        return { ...row, changeSets: user.changeSets };
    }

    // the users with their memberships: every one of them to a request naming no tenant, the one in the tenant of the
    // request otherwise. Their own roles only to a caller who may read every user
    private async resolveRows(users: User[], caller: CurrentUser<User>): Promise<UserRow[]> {
        const tenantId: string | undefined = this.tenantService.getActiveTenantId();
        const memberships: Membership[] = users.length ? await this.membershipRepository.findAll({
            where: { userId: users.map(u => u.id), ...tenantId == undefined ? {} : { tenantId } },
            limit: 'all',
            acrossTenants: true
        }) : [];
        const tenantNames: Map<string, string> = await findTenantNames(memberships.map(m => m.tenantId));
        const mayReadEveryUser: boolean = caller.platformPermissions.includes(PlatformPermissions.USERS_READ);
        // the change sets of a row are added by resolveRow
        // eslint-disable-next-line unusedImports/no-unused-vars
        return users.map(({ roles, changeSets, ...account }) => ({
            ...account,
            ...mayReadEveryUser ? { roles } : {},
            memberships: memberships.filter(m => m.userId === account.id).map(m => ({
                tenantId: m.tenantId,
                tenantName: tenantNames.get(m.tenantId) ?? '',
                roles: m.roles,
                deactivatedAt: m.deactivatedAt
            }))
        }));
    }

    private async inTransaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
        const transaction: Transaction = await this.userRepository.dataSource.startTransaction();
        try {
            const result: T = await work(transaction);
            await transaction.commit();
            return result;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    private parseImportedUsers(content: string): ImportedUser[] {
        let value: unknown;
        try {
            value = JsonUtilities.parse(content);
        }
        catch {
            throw new BadRequestError($ts`The file needs to be json.`);
        }
        if (!Array.isArray(value) || !value.every(u => this.isImportedUser(u))) {
            throw new BadRequestError($ts`The file needs to be an array of users, each with a "name" and an "email".`);
        }
        return value;
    }

    private isImportedUser(value: unknown): value is ImportedUser {
        return typeof value === 'object'
            && value != null
            && 'name' in value
            && typeof value.name === 'string'
            && 'email' in value
            && typeof value.email === 'string';
    }

    private async createWithPassword(data: ImportedUser, password: string, transaction: Transaction): Promise<User> {
        const user: User = await this.userRepository.create(
            { name: data.name, email: data.email, roles: [PlatformRoles.USER] },
            { transaction }
        );
        // the password an administrator chose is changed by the user at their first login
        await this.credentialsRepository.create({ userId: user.id, password, changeRequired: true }, { transaction });
        return user;
    }
}
