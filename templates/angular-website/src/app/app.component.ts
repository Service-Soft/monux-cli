import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavElementComponents } from '@service-soft/ngx-navigation/nav-element';
import { NavLinkComponent } from '@service-soft/ngx-navigation/nav-link';
import { NavTextComponent } from '@service-soft/ngx-navigation/nav-text';
import { NavTitleComponent } from '@service-soft/ngx-navigation/nav-title';
import { FooterComponent } from '@service-soft/ngx-navigation/footer';
import { FooterRow, NavbarRow } from '@service-soft/ngx-navigation/navigation';
import { NavbarComponent } from '@service-soft/ngx-navigation/navbar';

import { footerRows, navbarRows } from './navigation';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [FooterComponent, NavbarComponent, RouterOutlet]
})
export class AppComponent {
    protected readonly navbarRows: NavbarRow[] = navbarRows;
    protected readonly footerRows: FooterRow[] = footerRows;
    // only the components of the elements the rows use, so the website ships no code of the others. A link in the
    // navbar needs NavLinkComponent here too
    protected readonly navbarComponents: Partial<NavElementComponents> = { title: NavTitleComponent };
    protected readonly footerComponents: Partial<NavElementComponents> = { text: NavTextComponent, link: NavLinkComponent };
}
