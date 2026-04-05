// eslint-disable-next-line jsdoc/require-jsdoc
export const buttonStoriesTsContent: string = `import { componentWrapperDecorator, StoryFn, type Meta } from '@storybook/angular';

import { ButtonComponent } from './button.component';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<ButtonComponent> = {
    title: 'Components/Button',
    component: ButtonComponent,
    decorators: [componentWrapperDecorator(ButtonComponent, ({ args }) => ({ ...args }))],
    tags: ['autodocs'],
    argTypes: {
        color: {
            control: 'select',
            options: ['primary', 'secondary', 'success', 'warning', 'error'],
            description: 'The color theme of the button.',
            table: {
                defaultValue: {
                    summary: 'primary'
                }
            }
        },
        buttonType: {
            control: 'select',
            options: ['button', 'menu', 'reset', 'submit'],
            description: 'The html button type, what it should be used for.',
            table: {
                defaultValue: {
                    summary: 'button'
                }
            }
        },
        raised: {
            control: 'boolean'
        }
    },
    args: {}
};

export default meta;

type Story = StoryFn<ButtonComponent>;

export const Default: Story = (args) => ({ ...args, template: 'Primary' });`;