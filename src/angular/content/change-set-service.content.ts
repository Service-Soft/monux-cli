// eslint-disable-next-line jsdoc/require-jsdoc
export const changeSetServiceContent: string
= `import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseChangeSetService, ChangeSet } from 'ngx-material-change-sets';

import { AdminService } from './entities/admin.service';
import { Admin } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class ChangeSetService extends BaseChangeSetService {

    protected override readonly displayValueForEmptyCreatedBy: boolean = true;

    constructor(http: HttpClient, private readonly adminService: AdminService) {
        super(http);
    }

    override async openCreatedBy(changeSet: ChangeSet): Promise<void> {
        if (!changeSet.createdBy) {
            return;
        }
        const admin: Admin | undefined = (await this.adminService.read()).find(a => a.baseUserId === changeSet.createdBy);
        if (!admin) {
            throw new Error(\`Could not find user with baseUserId \${changeSet.createdBy}\`);
        }
        if (admin.id === changeSet.changeSetEntityId) {
            return;
        }
        this.adminService.editAdmin(admin);
    }

    override async getDisplayValueForCreatedBy(changeSet: ChangeSet): Promise<string> {
        if (changeSet.createdBy == undefined) {
            return 'System';
        }
        const admin: Admin | undefined = (await this.adminService.read()).find(a => a.baseUserId === changeSet.createdBy);
        if (!admin) {
            throw new Error(\`Could not find user with baseUserId \${changeSet.createdBy}\`);
        }
        return admin.name;
    }
}`;