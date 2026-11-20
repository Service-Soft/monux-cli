import { inject, Provider } from '@angular/core';
import { AuthRouteData, loggedInGuard, permissionGuard } from '@service-soft/ngx-auth/auth';
import { NavbarRow, NavRoute, NavRouteData, provideNavigationConfig } from '@service-soft/ngx-navigation/navigation';
import { CurrentUserProfile } from 'zibri-contract';
import { Permission, Permissions, PlatformPermission, PlatformPermissions } from '{{=contractPackage}}';

import { AppAuthService } from './app-auth.service';
import { TenantSwitcherComponent } from './components/tenant-switcher/tenant-switcher.component';

/**
 * A route of the app: what the navigation reads from it, and the permissions its guard checks, by the names of the api.
 */
export type AppRoute = NavRoute<NavRouteData & AuthRouteData<Permission, PlatformPermission>>;

/**
 * Whether somebody is logged in, which the links of a route without permissions need.
 * @returns Whether the user is logged in, which the navbar follows as it is a signal.
 */
function isLoggedIn(): boolean {
    return inject(AppAuthService).loggedIn();
}

/**
 * Whether the user can choose between tenants: their memberships, and every tenant with a platform permission. A user
 * with one membership and no platform permission acts in it, see the activeTenantId of ngx-auth.
 * @returns Whether the navbar shows the tenant switcher.
 */
function hasTenantChoice(): boolean {
    const user: CurrentUserProfile<Permission, PlatformPermission> | undefined = inject(AppAuthService).currentUser();
    return user != undefined && user.memberships.length + (user.platformPermissions.length ? 1 : 0) > 1;
}

/**
 * Shows a link only when the user may open its route: the permissions in its data, which its permissionGuard checks,
 * and the api again on every request. A route that names no permission always shows.
 * @returns The provider to add to the application config.
 */
export function provideAppNavigation(): Provider {
    return provideNavigationConfig({ routeCondition: route => inject(AppAuthService).hasRoutePermissions(route.data ?? {}) });
}

// what the app shows in its navbar. A link with a whole route also adds that route to the router, see app.routes.ts
export const navbarRows: NavbarRow[] = [
    {
        elements: [
            { type: 'title', title: '{{=title}}', link: { route: '' }, collapse: 'never' },
            {
                type: 'link',
                name: 'Users',
                // every user to an administrator of the application, the members of the active tenant to one of a tenant
                route: {
                    path: 'users',
                    title: 'Users | {{=title}}',
                    canActivate: [permissionGuard],
                    data: {
                        anyLevelPermission: { permission: Permissions.MEMBERS_READ, platformPermission: PlatformPermissions.USERS_READ }
                    },
                    loadComponent: async () => (await import('./pages/users/users.component')).UsersComponent
                } satisfies AppRoute
            },
            {
                type: 'link',
                name: 'Tenants',
                route: {
                    path: 'tenants',
                    title: 'Tenants | {{=title}}',
                    canActivate: [permissionGuard],
                    data: { platformPermission: PlatformPermissions.TENANTS_READ },
                    loadComponent: async () => (await import('./pages/tenants/tenants.component')).TenantsComponent
                } satisfies AppRoute
            },
            {
                type: 'link',
                name: 'Logs',
                route: {
                    path: 'logs',
                    title: 'Logs | {{=title}}',
                    canActivate: [permissionGuard],
                    data: {
                        anyLevelPermission: { permission: Permissions.LOGS_READ, platformPermission: PlatformPermissions.LOGS_READ_ALL }
                    },
                    loadComponent: async () => (await import('./pages/logs/logs.component')).LogsComponent
                } satisfies AppRoute
            },
            { type: 'custom', component: TenantSwitcherComponent, position: 'end', condition: hasTenantChoice },
            {
                type: 'link',
                name: 'Account',
                position: 'end',
                condition: isLoggedIn,
                route: {
                    path: 'account',
                    title: 'Account | {{=title}}',
                    canActivate: [loggedInGuard],
                    loadComponent: async () => (await import('./pages/account/account.component')).AccountComponent
                } satisfies AppRoute
            },
            {
                type: 'button',
                name: 'Log out',
                position: 'end',
                condition: isLoggedIn,
                action: () => inject(AppAuthService).logout()
            }
        ]
    }
];
