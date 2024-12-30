// eslint-disable-next-line jsdoc/require-jsdoc
export const newAdminModelContent: string
= `import { model, property } from '@loopback/repository';

import { Admin } from '../../models';

@model()
export class NewAdmin extends Admin {

    @property({
        type: 'string',
        required: true
    })
    override name!: string;

    @property({
        type: 'string',
        required: true,
        jsonSchema: {
            format: 'email'
        }
    })
    email!: string;

    @property({
        type: 'string',
        required: true,
        jsonSchema: {
            minLength: 12
        }
    })
    password!: string;
}`;