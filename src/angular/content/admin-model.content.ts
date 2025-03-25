import { DefaultEnvKeys } from '../../env';

// eslint-disable-next-line jsdoc/require-jsdoc
export function getAdminModelContent(apiName: string): string {
    return `import { ChangeSet } from 'ngx-material-change-sets';
import { array, custom, DecoratorTypes, string } from 'ngx-material-entity';
import { environment } from '../../environment/environment';

import { BaseEntity } from './base-entity.model';
import { ChangeSetsInputComponent, ChangeSetsInputMetadata } from '../components/change-sets-input/change-sets-input.component';

export class Admin extends BaseEntity {

    @string({
        displayName: 'Base User Id',
        displayStyle: 'line',
        display: false,
        omitForCreate: true,
        omitForUpdate: true,
        position: {
            tabName: 'General'
        }
    })
    baseUserId: string;

    @string({
        displayName: 'Name',
        displayStyle: 'line'
    })
    name: string;

    @string({
        displayName: 'Password',
        displayStyle: 'password',
        minLength: 8,
        omitForUpdate: true,
        confirmationDisplayName: 'Confirm Password'
    })
    password: string;

    @string({
        displayName: 'E-Mail',
        displayStyle: 'line'
    })
    email: string;

    @array({
        displayName: 'Roles',
        itemType: DecoratorTypes.STRING_AUTOCOMPLETE,
        autocompleteValues: Object.values(Roles) as string[],
        omitForCreate: true,
        omitForUpdate: true
    })
    roles: Roles[];

    @custom<ChangeSet[], ChangeSetsInputMetadata, Admin>({
        displayName: 'Change Sets',
        component: ChangeSetsInputComponent,
        customMetadata: {
            changeSetsApiBaseUrl: \`\${environment.${DefaultEnvKeys.baseUrl(apiName)}}/admins/change-sets\`
        },
        omitForCreate: true,
        // omitForUpdate: true,
        isReadOnly: true,
        position: {
            tab: 99,
            tabName: 'Changes'
        },
        defaultWidths: [12, 12, 12]
    })
    changeSets: ChangeSet[];

    constructor(entity?: Admin) {
        super(entity);
        this.baseUserId = entity?.baseUserId as string;
        this.email = entity?.email as string;
        this.name = entity?.name as string;
        this.password = entity?.password as string;
        this.roles = entity?.roles as Roles[];
        this.changeSets = entity?.changeSets as ChangeSet[];
    }
}`;
}