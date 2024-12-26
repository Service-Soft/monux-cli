import { NavElementTypes } from '../angular';

/**
 * Union of all ts values that should be handled custom.
 * Is used to create a record that is used in parsing/stringifying these values.
 */
export type CustomTsValues = NavElementTypes
    | 'provideZoneChangeDetection({ eventCoalescing: true })'
    | 'provideRouter(routes)'
    | 'provideClientHydration()'
    | 'provideAnimations()';

/**
 * Maps a custom ts value to a string.
 */
export const customTsValueToString: Record<CustomTsValues, string> = {
    internalLink: 'NavElementTypes.INTERNAL_LINK',
    titleWithInternalLink: 'NavElementTypes.TITLE_WITH_INTERNAL_LINK',
    'provideZoneChangeDetection({ eventCoalescing: true })': 'provideZoneChangeDetection({ eventCoalescing: true })',
    'provideRouter(routes)': 'provideRouter(routes)',
    'provideClientHydration()': 'provideClientHydration()',
    'provideAnimations()': 'provideAnimations()'
};

/**
 * Maps a string to a custom ts value.
 */
export const customTsStringToValue: Record<string, CustomTsValues> = {
    'NavElementTypes.INTERNAL_LINK': NavElementTypes.INTERNAL_LINK,
    'NavElementTypes.TITLE_WITH_INTERNAL_LINK': NavElementTypes.TITLE_WITH_INTERNAL_LINK,
    'provideZoneChangeDetection({ eventCoalescing: true })': 'provideZoneChangeDetection({ eventCoalescing: true })',
    'provideRouter(routes)': 'provideRouter(routes)',
    'provideClientHydration()': 'provideClientHydration()',
    'provideAnimations()': 'provideAnimations()'
};