import { ApiRoute, OwnTenantData, TENANT_FILTER } from '{{=contractPackage}}';
import { Auth, BaseMembership, Body, Controller, CurrentUser, Delete, FilterUtilities, Get, HttpStatus, inject, InternalError, MembershipServiceInterface, Newable, NotFoundError, PaginationResult, Param, PartialClass, Patch, PickClass, Post, Repository, repositoryTokenFor, Response, TenantDeletion, TenantServiceInterface, ZIBRI_DI_TOKENS, $ts } from 'zibri';

import { PlatformPermissions, Tenant, User } from '../models';

// what the list takes as its filter, checked against the Tenant once, at the start
const TENANT_FILTER_CLASS: Newable<object> = FilterUtilities.resolveFilterClass(TENANT_FILTER, Tenant);

/**
 * What creates a tenant.
 */
export class TenantCreateDto extends PickClass(Tenant, ['name']) {}

/**
 * What renames a tenant. Deactivating it has routes of their own, through which zibri ends the requests of the tenant.
 */
export class TenantUpdateDto extends PartialClass(TenantCreateDto) {}

/**
 * A tenant the logged in user is a member of.
 */
export class OwnTenant extends PickClass(Tenant, ['id', 'name']) implements OwnTenantData {}

/**
 * The tenants, which the administrators of the application create, rename, deactivate and delete, and which every
 * user picks the tenant to act in from. A tenant is deactivated before it is deleted, see the tenancy docs. The
 * TenantService of zibri does both, which a TenantService of your own may leave out until zibri 4.0.
 */
@Controller(`/${ApiRoute.TENANTS}`)
export class TenantController {
    private readonly tenantRepository: Repository<Tenant> = inject(repositoryTokenFor(Tenant));

    private readonly tenantService: TenantServiceInterface = inject(ZIBRI_DI_TOKENS.TENANT_SERVICE);

    private readonly membershipService: MembershipServiceInterface = inject(ZIBRI_DI_TOKENS.MEMBERSHIP_SERVICE);

    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_READ)
    @Response.paginated(Tenant)
    @Get()
    async findAll(
        @Param.query('page', { type: 'number', format: 'integer', min: 1 })
        page: number,
        @Param.query('limit', { type: 'number', format: 'integer', min: 1, max: 100 })
        limit: number,
        @Param.query('filter', { type: 'object', cls: () => TENANT_FILTER_CLASS, required: false })
        filter?: object
    ): Promise<PaginationResult<Tenant>> {
        return await this.tenantRepository.findAllPaginated(page, limit, {
            where: filter == undefined ? undefined : FilterUtilities.resolveWhere(TENANT_FILTER, Tenant, filter)
        });
    }

    // the tenants the logged in user acts in, which the admin app lets them choose from. Like GET /auth/me, without
    // the deactivated ones
    @Auth.isLoggedIn()
    @Response.array(OwnTenant)
    @Get('/mine')
    async findOwn(@CurrentUser() user: CurrentUser<User>): Promise<OwnTenant[]> {
        const memberships: BaseMembership<string>[] = await this.membershipService.findActiveMemberships(user.id);
        if (!memberships.length) {
            return [];
        }
        const tenants: Tenant[] = await this.tenantRepository.findAll({ where: { id: memberships.map(m => m.tenantId) }, limit: 'all' });
        return tenants.filter(t => t.deactivatedAt == undefined).map(t => ({ id: t.id, name: t.name }));
    }

    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_READ)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(Tenant)
    @Get('/:id')
    async findById(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<Tenant> {
        return await this.tenantRepository.findById(id);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_CREATE)
    @Response.object(Tenant, { status: HttpStatus.CREATED })
    @Post()
    async create(@Body(TenantCreateDto) data: TenantCreateDto): Promise<Tenant> {
        return await this.tenantRepository.create(data);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_UPDATE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(Tenant)
    @Patch('/:id')
    async updateById(
        @Param.path('id', { type: 'string', format: 'uuid' }) id: string,
        @Body(TenantUpdateDto) data: TenantUpdateDto
    ): Promise<Tenant> {
        return await this.tenantRepository.updateById(id, data);
    }

    // refuses every request for the tenant, and ends the work it queued, until it is reactivated
    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_UPDATE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(Tenant)
    @Post('/:id/deactivate')
    async deactivate(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<Tenant> {
        await this.tenantRepository.findById(id);
        await this.tenantService.deactivateTenant?.(id);
        return await this.tenantRepository.findById(id);
    }

    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_UPDATE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(Tenant)
    @Post('/:id/reactivate')
    async reactivate(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<Tenant> {
        await this.tenantRepository.findById(id);
        await this.tenantService.reactivateTenant?.(id);
        return await this.tenantRepository.findById(id);
    }

    // deletes a deactivated tenant and every row of it, in the background: the deletion answers how far it got.
    // Back the tenant up first, see the backup docs
    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_DELETE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(TenantDeletion, { status: HttpStatus.ACCEPTED })
    @Delete('/:id')
    async deleteById(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<TenantDeletion> {
        await this.tenantRepository.findById(id);
        const deletion: TenantDeletion | undefined = await this.tenantService.deleteTenant?.(id);
        if (deletion == undefined) {
            throw new InternalError('The TenantService of the application deletes no tenants.');
        }
        return deletion;
    }

    @Auth.hasPlatformPermission(PlatformPermissions.TENANTS_DELETE)
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.object(TenantDeletion)
    @Get('/:id/deletion')
    async findDeletion(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<TenantDeletion> {
        const deletion: TenantDeletion | undefined = await this.tenantService.findTenantDeletion?.(id);
        if (deletion == undefined) {
            throw new NotFoundError($ts`The tenant is not being deleted.`);
        }
        return deletion;
    }
}
