// eslint-disable-next-line jsdoc/require-jsdoc
export const adminsPageTsContent: string
= `import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgxMatEntityTableComponent, TableData } from 'ngx-material-entity';
import { Admin } from '../../models/admin.model';
import { AdminService } from '../../services/entities/admin.service';

@Component({
    selector: 'app-admins',
    templateUrl: './admins.component.html',
    standalone: true,
    imports: [
        CommonModule,
        NgxMatEntityTableComponent
    ]
})
export class AdminsComponent {
    tableConfig: TableData<Admin> = {
        baseData: {
            title: 'Admins',
            displayColumns: [
                {
                    displayName: 'Name',
                    value: admin => admin.name
                },
                {
                    displayName: 'E-Mail',
                    value: admin => admin.email
                }
            ],
            EntityServiceClass: AdminService,
            EntityClass: Admin
        }
    };
}`;