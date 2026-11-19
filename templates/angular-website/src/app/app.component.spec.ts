import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [provideRouter(routes)]
        }).compileComponents();
    });

    it('shows the start page between the navbar and the footer', async () => {
        const fixture: ComponentFixture<AppComponent> = TestBed.createComponent(AppComponent);
        await TestBed.inject(Router).navigateByUrl('/');
        await fixture.whenStable();
        const page: HTMLElement = fixture.nativeElement as HTMLElement;

        expect(page.querySelector('h1')?.textContent).toContain('{{=title}}');
        expect([...page.querySelectorAll('footer a')].map(a => a.getAttribute('href'))).toEqual(['/imprint', '/privacy']);
    });
});
