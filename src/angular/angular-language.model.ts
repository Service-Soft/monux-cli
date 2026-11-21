/**
 * A language of an Angular project, as its i18n and its language switcher have it.
 */
export type AngularLanguage = {
    /**
     * The code of the language, such as "de".
     */
    code: string,
    /**
     * The path the language is built below: its code, or the root for a project of one language.
     */
    subPath: string,
    /**
     * The name of the language in itself, such as "Deutsch".
     */
    label: string
};