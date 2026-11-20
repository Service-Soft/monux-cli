import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { environment } from './environment/environment';

/**
 * Starts the api: on the port of the workspace during development, on 3000 in its container, behind traefik.
 */
async function bootstrap(): Promise<void> {
    const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(AppModule);
    // behind traefik, which forwards the address of the client
    app.set('trust proxy', 1);
    // the OpenAPI document of the api, at /api and as json at /api-json
    SwaggerModule.setup('api', app, () => SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('{{=name}}').build()));
    await app.listen(environment.env === 'dev' ? environment.{{=portKey}} : 3000);
}

// a start that fails ends the process with its error, as every rejected promise nobody handles does
void bootstrap();
