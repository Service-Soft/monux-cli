import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAuth } from '@service-soft/ngx-auth/auth';
import { AppPage } from '{{=contractPackage}}';

import { AppAuthService } from './app-auth.service';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { provideAppNavigation } from './navigation';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideRouter(routes),
                provideAppNavigation(),
                provideHttpClient(),
                provideAuth(AppAuthService, { apiUrl: 'http://localhost:3000/auth', strategy: 'jwt' })
            ]
        }).compileComponents();
    });

    it('sends a user who is not logged in to the login', async () => {
        const fixture: ComponentFixture<AppComponent> = TestBed.createComponent(AppComponent);
        const router: Router = TestBed.inject(Router);
        await router.navigateByUrl('/account');
        await fixture.whenStable();
        const page: HTMLElement = fixture.nativeElement as HTMLElement;

        // the login opens the page they wanted once they are logged in
        expect(router.parseUrl(router.url).queryParams).toEqual({ returnUrl: '/account' });
        expect(router.url.startsWith('/login')).toBe(true);
        expect(page.querySelector('input[type="email"]')).not.toBeNull();
        // the navbar shows only the title to somebody who is not logged in
        expect([...page.querySelectorAll('header a')].map(a => a.getAttribute('href'))).toEqual(['/']);
    });

    it('opens the link of an invitation without a login', async () => {
        const fixture: ComponentFixture<AppComponent> = TestBed.createComponent(AppComponent);
        const router: Router = TestBed.inject(Router);
        await router.navigateByUrl(`/${AppPage.ACCEPT_INVITATION}/a-token`);
        fixture.detectChanges();

        expect(router.url).toBe(`/${AppPage.ACCEPT_INVITATION}/a-token`);
        expect((fixture.nativeElement as HTMLElement).querySelector('ngx-accept-invitation')).not.toBeNull();
    });
});
