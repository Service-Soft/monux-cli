import { ApplicationRef } from '@angular/core';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Starts the project on the server, for every page it renders.
 * @param context - What the server hands to the rendering of a page.
 * @returns The started application.
 */
export default async function bootstrap(context: BootstrapContext): Promise<ApplicationRef> {
    return await bootstrapApplication(AppComponent, config, context);
}
