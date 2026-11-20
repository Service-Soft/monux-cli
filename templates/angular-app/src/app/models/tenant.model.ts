import { Property } from '@service-soft/ngx-entity/entity';
import { TenantData } from '{{=contractPackage}}';

/**
 * A tenant of the api, as the admin app shows and renames it. Deactivating and deleting it are actions of its row, see
 * the TenantService.
 */
export class Tenant implements TenantData {
    @Property.string({ displayName: 'Id', format: 'uuid', omitForCreate: true, readonly: true, display: false })
    id!: string;

    @Property.string({ displayName: 'Name' })
    name!: string;

    @Property.date({ displayName: 'Deactivated', required: false, omitForCreate: true, omitForUpdate: true, readonly: true })
    deactivatedAt?: Date | null;
}
