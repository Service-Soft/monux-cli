import { Component } from '@angular/core';
import { ChangePasswordComponent, provideChangePasswordConfig } from '@service-soft/ngx-auth/change-password';
import { SessionsComponent } from '@service-soft/ngx-auth/sessions';
import { TwoFactorSettingsComponent } from '@service-soft/ngx-auth/two-factor';
import { PASSWORD_MIN_LENGTH } from '{{=contractPackage}}';

@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    imports: [ChangePasswordComponent, SessionsComponent, TwoFactorSettingsComponent],
    // the browser checks a new password the way the api does, before sending it
    providers: [provideChangePasswordConfig({ newPasswordMinLength: PASSWORD_MIN_LENGTH })]
})
export class AccountComponent {}
