import { ApiRoute } from '{{=contractPackage}}';
import { $ts, Auth, BadRequestError, Body, Controller, CurrentUser, Get, inject, InjectRepository, Log, LogContext, LogLevel, PaginationResult, Param, PickClass, Post, Property, RateLimited, Repository, Response, TenantServiceInterface, ZIBRI_DI_TOKENS } from 'zibri';

import { LOG_APPLICATIONS } from '../log-applications';
import { Permissions, PlatformPermissions, User } from '../models';
import { LogRateLimiter } from '../rate-limiters';

/**
 * Where a log of an app comes from, and the error it is about.
 */
export class NewLogContext extends PickClass(LogContext, ['origin', 'metadata', 'error']) {}

/**
 * A log an app sends.
 */
export class NewLogData extends PickClass(Log, ['level', 'message']) {
    @Property.string({ maxLength: 100 })
    application!: string;

    @Property.object({ cls: () => NewLogContext })
    context!: NewLogContext;
}

/**
 * The logs of this api and of its apps, in one table. The administrators of the application read every log, the
 * administrators of a tenant the logs of their tenant.
 */
@Controller(`/${ApiRoute.LOGS}`)
export class LogController {
    private readonly tenantService: TenantServiceInterface = inject(ZIBRI_DI_TOKENS.TENANT_SERVICE);

    constructor(
        @InjectRepository(Log)
        private readonly logRepository: Repository<Log>
    ) {}

    // open to everyone, as errors happen before a login too. Rate limited and narrowed to the known apps instead
    @Auth.skip()
    @RateLimited(LogRateLimiter)
    @Response.empty()
    @Post()
    async create(
        @Body(NewLogData, { maxSize: '64kb' }) data: NewLogData,
        @CurrentUser({ required: false }) user?: CurrentUser<User>
    ): Promise<void> {
        if (!LOG_APPLICATIONS.includes(data.application)) {
            throw new BadRequestError($ts`The application needs to be one of the apps of this api.`);
        }
        const cleanupAfterInMs: Record<LogLevel, number> = inject(ZIBRI_DI_TOKENS.LOGGER_CLEANUP_AFTER_IN_MS);
        await this.logRepository.create({
            application: data.application,
            level: data.level,
            message: data.message,
            context: data.context,
            cleanupAt: new Date(Date.now() + cleanupAfterInMs[data.level]),
            // the log of a logged in user belongs to the tenant of the request, which zibri checked their membership
            // in. The log of an anonymous caller to none, as anybody can name any tenant in a header
            tenantId: user == undefined ? null : this.tenantService.getActiveTenantId() ?? null
        }, { acrossTenants: true });
    }

    // every log to a request naming no tenant, the logs of the tenant of the request otherwise
    @Auth.hasAnyLevelPermission({ permission: Permissions.LOGS_READ, platformPermission: PlatformPermissions.LOGS_READ_ALL })
    @Response.paginated(Log)
    @Get()
    async findAll(
        @Param.query('page', { type: 'number', format: 'integer', min: 1 })
        page: number,
        @Param.query('limit', { type: 'number', format: 'integer', min: 1, max: 100 })
        limit: number,
        @Param.query('levels', { type: 'array', items: { type: 'number', format: 'integer' }, required: false })
        levels?: LogLevel[],
        @Param.query('applications', { type: 'array', items: { type: 'string' }, required: false })
        applications?: string[],
        @Param.query('search', { type: 'string', required: false })
        search?: string
    ): Promise<PaginationResult<Log>> {
        const tenantId: string | undefined = this.tenantService.getActiveTenantId();
        return await this.logRepository.findAllPaginated(page, limit, {
            where: {
                // inside a tenant zibri answers the logs of no tenant as well, which can hold what any tenant did
                ...tenantId == undefined ? {} : { tenantId },
                ...levels ? { level: levels } : {},
                ...applications ? { application: applications } : {},
                // "%" and "_" in the search are wildcards, which is what someone searching logs expects
                ...search ? { message: { iLike: `%${search}%` } } : {}
            },
            order: { createdAt: 'DESC' },
            // narrowed by the where above
            acrossTenants: true
        });
    }
}
