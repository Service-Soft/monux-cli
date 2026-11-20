import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavButtonComponent } from '@service-soft/ngx-navigation/nav-button';
import { NavElementComponents } from '@service-soft/ngx-navigation/nav-element';
import { NavLinkComponent } from '@service-soft/ngx-navigation/nav-link';
import { NavTitleComponent } from '@service-soft/ngx-navigation/nav-title';
import { NavbarRow } from '@service-soft/ngx-navigation/navigation';
import { NavbarComponent } from '@service-soft/ngx-navigation/navbar';
import { OfflineStatusBarComponent } from '@service-soft/ngx-pwa/offline-status-bar';

import { AppAuthService } from './app-auth.service';
import { navbarRows } from './navigation';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [NavbarComponent, OfflineStatusBarComponent, RouterOutlet]
})
export class AppComponent {
    protected readonly authService: AppAuthService = inject(AppAuthService);
    protected readonly navbarRows: NavbarRow[] = navbarRows;
    // only the components of the elements the rows use, so the app ships no code of the others
    protected readonly navbarComponents: Partial<NavElementComponents> = {
        title: NavTitleComponent,
        link: NavLinkComponent,
        button: NavButtonComponent
    };
}
