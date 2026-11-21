import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, test } from 'vitest';

import { provide{{=className}}Config } from './{{=fileName}}-config.provider';
import { {{=className}}Component } from './{{=fileName}}.component';

@Component({
    selector: '{{=selector}}-host',
    template: '<{{=selector}}>Default</{{=selector}}><{{=selector}} color="primary">Primary</{{=selector}}>',
    imports: [{{=className}}Component]
})
class {{=className}}HostComponent {}

async function render(): Promise<HTMLElement[]> {
    const fixture: ComponentFixture<{{=className}}HostComponent> = TestBed.createComponent({{=className}}HostComponent);
    await fixture.whenStable();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('{{=selector}}')];
}

describe('{{=className}}Component', () => {
    test('shows its content in the color it is given, or in the one of its config', async () => {
        TestBed.configureTestingModule({ providers: [provide{{=className}}Config({ color: 'secondary' })] });

        const [byConfig, byInput] = await render();

        expect(byConfig?.textContent).toBe('Default');
        expect(byConfig?.classList).toContain('bg-secondary');
        expect(byInput?.classList).toContain('bg-primary');
    });
});
