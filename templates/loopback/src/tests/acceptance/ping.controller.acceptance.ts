import { Client } from '@loopback/testlab';

import { {{=applicationClass}} } from '../..';
import { setupApplication } from './test-helper';

describe('PingController', () => {
    let app: {{=applicationClass}};
    let client: Client;

    before('setupApplication', async () => {
        ({ app, client } = await setupApplication());
    });

    after(async () => {
        await app.stop();
    });

    it('invokes GET /ping', async () => {
        await client
            .get('/ping?msg=world')
            .expect(200)
            .expect(/"greeting":"Hello from LoopBack"/);
    });
});
