import { Meta, StoryObj } from '@storybook/angular';

import { {{=className}}Color } from './{{=fileName}}-color.type';
import { {{=className}}Component } from './{{=fileName}}.component';

const COLORS: {{=className}}Color[] = ['surface', 'primary', 'secondary'];

const meta: Meta<{{=className}}Component> = {
    title: '{{=storyTitle}}',
    component: {{=className}}Component,
    argTypes: {
        color: { control: 'inline-radio', options: COLORS }
    },
    args: {
        color: 'surface'
    },
    render: args => ({
        props: args,
        template: '<{{=selector}} [color]="color">Opening hours changed</{{=selector}}>'
    })
};
export default meta;

type Story = StoryObj<{{=className}}Component>;

export const Playground: Story = {};

// every color, and a text that wraps
export const Colors: Story = {
    render: () => ({
        props: { colors: COLORS },
        template: `
            <div class="grid max-w-md gap-3">
                @for (color of colors; track color) {
                    <{{=selector}} [color]="color">
                        {{ color }}: a text that is long enough to wrap onto a second line
                    </{{=selector}}>
                }
            </div>
        `
    })
};
