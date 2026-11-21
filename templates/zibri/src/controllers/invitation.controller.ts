import { ApiRoute, InvitationRequestData } from '{{=contractPackage}}';
import { $ts, Auth, Body, Controller, CurrentUser, Delete, ForbiddenError, Get, HttpStatus, inject, InvitationCreateOn, InvitationServiceInterface, PaginationResult, Param, Post, Property, Response, TenantServiceInterface, ZIBRI_DI_TOKENS } from 'zibri';

import { Invitation, Permissions, PlatformPermissions, User } from '../models';
import { InvitationRepository } from '../repositories';
import { findTenantNames } from '../services/tenant-names.function';

/**
 * Who is invited, with which roles, and when their account is created.
 */
export class InvitationRequest implements InvitationRequestData {
    @Property.string({ format: 'email' })
    email!: string;

    @Property.string()
    name!: string;

    @Property.string({ format: 'uuid', required: false })
    tenantId?: string;

    // tenant roles of the tenant, or platform roles for an invitation to the application only
    @Property.array({ items: { type: 'string' } })
    roles!: string[];

    // 'accept' creates the account and the membership once the invitation is accepted, 'invite' right away, so that
    // administrators manage them before the invited person answers
    @Property.string({ enum: { invite: 'invite', accept: 'accept' } })
    createOn!: InvitationCreateOn;

    @Property.boolean()
    declinable!: boolean;
}

/**
 * An open invitation, with the name of its tenant.
 */
export class InvitationRow extends Invitation {
    @Property.string({ required: false })
    tenantName?: string | null;
}

/**
 * The invitations of the admin app. The administrators of a tenant invite people to it, the administrators of the
 * application to any tenant or to the application only. zibri sends the mail, and its AuthController answers the link.
 * See the invitations docs.
 */
@Auth.hasAnyLevelPermission({ permission: Permissions.MEMBERS_INVITE, platformPermission: PlatformPermissions.USERS_CREATE })
@Controller(`/${ApiRoute.INVITATIONS}`)
export class InvitationController {
    private readonly invitationService: InvitationServiceInterface = inject(ZIBRI_DI_TOKENS.INVITATION_SERVICE);

    private readonly invitationRepository: InvitationRepository = inject(InvitationRepository);

    private readonly tenantService: TenantServiceInterface = inject(ZIBRI_DI_TOKENS.TENANT_SERVICE);

    // zibri checks the roles like assignRole checks them, so nobody invites into more than they may hand out
    @Response.object(InvitationRow, { status: HttpStatus.CREATED })
    @Post()
    async invite(@CurrentUser() caller: CurrentUser<User>, @Body(InvitationRequest) request: InvitationRequest): Promise<InvitationRow> {
        const activeTenantId: string | undefined = this.tenantService.getActiveTenantId();
        const tenantId: string | undefined = request.tenantId?.toLowerCase() ?? activeTenantId;
        if (tenantId !== activeTenantId && !caller.platformPermissions.includes(PlatformPermissions.MEMBERSHIPS_MANAGE)) {
            throw new ForbiddenError(
                $ts`An invitation to another tenant than the one of the request needs the permission to manage every membership.`
            );
        }
        const invitation: Invitation = await this.invitationService.invite<Invitation>(caller, {
            email: request.email,
            name: request.name,
            tenantId,
            roles: request.roles,
            createOn: request.createOn,
            declinable: request.declinable,
            expiresInMs: undefined
        }, undefined);
        const [row] = await this.resolveRows([invitation]);
        return row;
    }

    // the invitations of the tenant of the request, or every one to a request naming none
    @Response.paginated(InvitationRow)
    @Get()
    async findAll(
        @Param.query('page', { type: 'number', format: 'integer', min: 1 })
        page: number,
        @Param.query('limit', { type: 'number', format: 'integer', min: 1, max: 100 })
        limit: number
    ): Promise<PaginationResult<InvitationRow>> {
        const tenantId: string | undefined = this.tenantService.getActiveTenantId();
        const result: PaginationResult<Invitation> = await this.invitationRepository.findAllPaginated(page, limit, {
            // inside a tenant zibri answers the invitations to the application only as well
            where: tenantId == undefined ? {} : { tenantId },
            order: { email: 'ASC' },
            acrossTenants: true
        });
        return { items: await this.resolveRows(result.items), totalAmount: result.totalAmount };
    }

    // mails a new link, and the one before stops working
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.empty()
    @Post('/:id/resend')
    async resend(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<void> {
        await this.inTenantOf(id, async () => await this.invitationService.resend(id, undefined));
    }

    // withdraws the invitation, and what createOn 'invite' created with it
    @Response.error(HttpStatus.NOT_FOUND)
    @Response.empty()
    @Delete('/:id')
    async revoke(@Param.path('id', { type: 'string', format: 'uuid' }) id: string): Promise<void> {
        await this.inTenantOf(id, async () => await this.invitationService.revoke(id, undefined));
    }

    // zibri reads an invitation by its id in the active tenant: the one of the request, which narrows it to the
    // invitations of that tenant, or the one of the invitation for a request naming none
    private async inTenantOf(id: string, work: () => Promise<void>): Promise<void> {
        if (this.tenantService.getActiveTenantId() != undefined) {
            await work();
            return;
        }
        const invitation: Invitation = await this.invitationRepository.findById(id, { acrossTenants: true });
        await (invitation.tenantId == undefined ? work() : this.tenantService.runAs(invitation.tenantId, work));
    }

    private async resolveRows(invitations: Invitation[]): Promise<InvitationRow[]> {
        const tenantNames: Map<string, string> = await findTenantNames(invitations.flatMap(i => i.tenantId ?? []));
        return invitations.map(invitation => ({
            ...invitation,
            tenantName: invitation.tenantId == undefined ? null : tenantNames.get(invitation.tenantId) ?? null
        }));
    }
}
