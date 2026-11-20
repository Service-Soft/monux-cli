import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, resource, ResourceRef, Signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { faBuilding, faCheck } from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from '@service-soft/ui/button';
import { IconComponent, IconDefinition } from '@service-soft/ui/icon';
import { MenuComponent, MenuItemComponent, MenuTriggerDirective } from '@service-soft/ui/menu';
import { ApiRoute, OwnTenantData } from '{{=contractPackage}}';
import { firstValueFrom } from 'rxjs';

import { AppAuthService } from '../../app-auth.service';
import { environment } from '../../../environment/environment';

/**
 * A tenant the user can choose to act in, or every tenant without an id.
 */
type TenantChoice = {
    /**
     * The id of the tenant, undefined for every tenant.
     */
    id: string | undefined,
    /**
     * What the menu shows.
     */
    name: string,
    /**
     * Whether the user acts in it now.
     */
    isCurrent: boolean
};

/**
 * Chooses the tenant the user acts in, which every request to the api names, see ngx-auth. "All tenants" acts in none,
 * which only the platform permissions of the user pass. The navbar shows it to a user with more than one choice, see
 * navigation.ts.
 */
@Component({
    selector: 'app-tenant-switcher',
    templateUrl: './tenant-switcher.component.html',
    imports: [ButtonComponent, IconComponent, MenuComponent, MenuItemComponent, MenuTriggerDirective],
    host: {
        class: 'contents'
    }
})
export class TenantSwitcherComponent {
    private readonly authService: AppAuthService = inject(AppAuthService);

    // not the TenantService, whose ngx-entity would be downloaded before the first page
    private readonly http: HttpClient = inject(HttpClient);

    private readonly router: Router = inject(Router);

    // the names of the tenants of the user, read again for another login
    private readonly ownTenants: ResourceRef<OwnTenantData[] | undefined> = resource({
        params: () => this.authService.currentUser()?.id,
        loader: async () => await firstValueFrom(
            this.http.get<OwnTenantData[]>(`${environment.{{=apiPrefix}}_base_url}/${ApiRoute.TENANTS}/mine`)
        )
    });

    protected readonly icon: IconDefinition = faBuilding;

    protected readonly currentIcon: IconDefinition = faCheck;

    protected readonly choices: Signal<TenantChoice[]> = computed(() => {
        const activeTenantId: string | undefined = this.authService.activeTenantId();
        const tenants: OwnTenantData[] = this.ownTenants.hasValue() ? this.ownTenants.value() : [];
        const all: Omit<TenantChoice, 'isCurrent'>[] = this.authService.currentUser()?.platformPermissions.length
            ? [{ id: undefined, name: 'All tenants' }]
            : [];
        return [...all, ...tenants].map(choice => ({ ...choice, isCurrent: choice.id === activeTenantId }));
    });

    protected readonly current: Signal<TenantChoice | undefined> = computed(() => this.choices().find(choice => choice.isCurrent));

    /**
     * Acts in another tenant. The page shows what it holds, see app.component.html, or the start of the app when the
     * user may not open the page there.
     * @param tenantId - The id of the tenant, undefined for every tenant.
     */
    protected async choose(tenantId: string | undefined): Promise<void> {
        this.authService.setActiveTenant(tenantId);
        let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
        while (route.firstChild != undefined) {
            route = route.firstChild;
        }
        if (!this.authService.hasRoutePermissions(route.data, route)) {
            await this.router.navigateByUrl('/');
        }
    }
}
