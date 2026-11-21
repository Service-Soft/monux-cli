/**
 * AXE rules about the structure of a whole page, which a single story is not. They are disabled in the accessibility
 * panel and in tests/accessibility.spec.ts. Stories are checked including the body, because overlays like dialogs
 * render outside of the story's root.
 */
export const PAGE_LEVEL_RULES: string[] = ['region', 'landmark-one-main', 'page-has-heading-one'];
