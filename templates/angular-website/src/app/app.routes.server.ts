import { RenderMode, ServerRoute } from '@angular/ssr';

// every page is rendered when the website is built, so a visitor gets it without waiting for a server to render it.
// A page whose content has to be rendered for each request, like one showing data of an api, gets RenderMode.Server
export const serverRoutes: ServerRoute[] = [
    { path: '', renderMode: RenderMode.Prerender },
    { path: 'imprint', renderMode: RenderMode.Prerender },
    { path: 'privacy', renderMode: RenderMode.Prerender },
    // mx generate-page adds the pages it generates above this line
    // an unknown url answers 404, which tells search engines there is no such page
    { path: '**', renderMode: RenderMode.Server, status: 404 }
];
