import { toSnakeCase } from '../../utilities';

// eslint-disable-next-line jsdoc/require-jsdoc
export function getAdminServiceContent(apiName: string): string {
    return `import { HttpClient } from '@angular/common/http';
import { EnvironmentInjector, inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EditEntityData, EntityService, NgxMatEntityEditDialogComponent } from 'ngx-material-entity';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment';

import { Admin } from '../../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService extends EntityService<Admin> {

    override readonly baseUrl: string = \`\${environment.${toSnakeCase(apiName)}_base_url}/admins\`;

    private readonly dialog: MatDialog;

    constructor(http: HttpClient, injector: EnvironmentInjector) {
        super(http, injector);
        this.dialog = inject(MatDialog);
    }

    /**
     * Edits the currently logged in admin.
     */
    async editCurrentAdmin(): Promise<void> {
        const adminData: Admin = await firstValueFrom(this.http.get<Admin>(\`\${this.baseUrl}/me\`));
        this.editAdmin(adminData);
    }

    /**
     * Edits the provided admin.
     * @param admin - The admin to edit.
     */
    editAdmin(admin: Admin): void {
        const data: EditEntityData<Admin> = {
            entity: new Admin(admin),
            EntityServiceClass: AdminService
        };
        this.dialog.open(NgxMatEntityEditDialogComponent, {
            data: data,
            minWidth: '60%'
        });
    }
}`;
}