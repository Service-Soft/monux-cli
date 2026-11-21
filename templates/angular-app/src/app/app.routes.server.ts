import { RenderMode, ServerRoute } from '@angular/ssr';

// every page is rendered in the browser: what it shows depends on who is logged in, which only the browser knows
export const serverRoutes: ServerRoute[] = [
    { path: '**', renderMode: RenderMode.Client }
];
