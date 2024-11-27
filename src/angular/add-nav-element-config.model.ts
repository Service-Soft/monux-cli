import type { NavElement, NavFooterElement } from 'ngx-material-navigation';

/**
 * Configuration for adding a new navigation element.
 */
export type AddNavElementConfig = AddNavbarElementConfig | AddFooterElementConfig;

/**
 * Configuration for adding a new navigation element to the navbar.
 */
interface AddNavbarElementConfig {
    /**
     * Where to add the element to.
     */
    addTo: 'navbar',
    /**
     * The index of the row to add the element to.
     */
    rowIndex: number,
    /**
     * The actual element to add.
     */
    element: NavElement
}

/**
 * Configuration for adding a new navigation element to the footer.
 */
interface AddFooterElementConfig {
    /**
     * Where to add the element to.
     */
    addTo: 'footer',
    /**
     * The index of the row to add the element to.
     */
    rowIndex: number,
    /**
     * The actual element to add.
     */
    element: NavFooterElement
}