import { notLoggedInGuard } from '@service-soft/ngx-auth/auth';
import { provideAcceptInvitationConfig } from '@service-soft/ngx-auth/accept-invitation';
import { provideConfirmPasswordResetConfig } from '@service-soft/ngx-auth/confirm-password-reset';
import { provideLoginConfig } from '@service-soft/ngx-auth/login';
import { AppPage, PASSWORD_MIN_LENGTH } from '{{=contractPackage}}';

import { AppRoute } from './navigation';

// the pages of logging in, of resetting a password and of accepting an invitation, with their configs. A file of its
// own that app.routes.ts loads when one of them opens, so the code of the pages stays out of what every other page
// downloads first
export const authRoutes: AppRoute[] = [
    {
        path: 'login',
        title: $localize`:@@login.title:Log in | {{=title}}`,
        canActivate: [notLoggedInGuard],
        // the browser checks a new password the way the api does, before sending it
        providers: [provideLoginConfig({ newPasswordMinLength: PASSWORD_MIN_LENGTH })],
        loadComponent: async () => (await import('@service-soft/ngx-auth/login')).LoginComponent
    },
    {
        path: 'request-password-reset',
        title: $localize`:@@requestPasswordReset.title:Reset your password | {{=title}}`,
        canActivate: [notLoggedInGuard],
        loadComponent: async () => (await import('@service-soft/ngx-auth/request-password-reset')).RequestPasswordResetComponent
    },
    // the page a password reset mail links to: the api adds the token to its url, see the env.ts of the api
    {
        path: `${AppPage.CONFIRM_PASSWORD_RESET}/:token`,
        title: $localize`:@@confirmPasswordReset.title:Set a new password | {{=title}}`,
        providers: [provideConfirmPasswordResetConfig({ newPasswordMinLength: PASSWORD_MIN_LENGTH })],
        loadComponent: async () => (await import('@service-soft/ngx-auth/confirm-password-reset')).ConfirmPasswordResetComponent
    },
    // the page an invitation mail links to, the same way, see the INVITATION_OPTIONS in the providers.ts of the api.
    // Without a guard: an invitation to an existing account is accepted logged in, one that creates it logged out
    {
        path: `${AppPage.ACCEPT_INVITATION}/:token`,
        title: $localize`:@@acceptInvitation.title:Invitation | {{=title}}`,
        providers: [provideAcceptInvitationConfig({ newPasswordMinLength: PASSWORD_MIN_LENGTH })],
        loadComponent: async () => (await import('@service-soft/ngx-auth/accept-invitation')).AcceptInvitationComponent
    }
];
