// eslint-disable-next-line jsdoc/require-jsdoc
export const buttonComponentHtmlContent: string = `<button 
    class="transition duration-200 ease-in-out rounded-md p-2 px-4 font-semibold"
    [ngClass]="{
        'bg-primary hover:bg-primary-darker text-primary-contrast': color === 'primary',
        'bg-secondary hover:bg-secondary-darker text-secondary-contrast': color === 'secondary',
        'bg-success hover:bg-success-darker text-success-contrast': color === 'success',
        'bg-warning hover:bg-warning-darker text-warning-contrast': color === 'warning',
        'bg-error hover:bg-error-darker text-error-contrast': color === 'error',
        'shadow-elevation-8': raised
    }"
    [type]="buttonType"
>
    <ng-content></ng-content>
</button>`;