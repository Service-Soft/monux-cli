// eslint-disable-next-line jsdoc/require-jsdoc
export const fullAdminModelContent: string
= `import { model, property } from '@loopback/repository';

import { Admin } from '../../models';

@model()
export class FullAdmin extends Admin {

    @property({
        type: 'string',
        required: true,
        jsonSchema: {
            format: 'email'
        }
    })
    email!: string;

    @property({
        type: 'array',
        itemType: 'string',
        required: true,
        jsonSchema: {
            items: {
                enum: Object.values(Roles)
            }
        }
    })
    roles!: Roles[];
}`;