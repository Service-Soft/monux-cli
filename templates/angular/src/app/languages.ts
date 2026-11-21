import { LanguageSwitcherLanguage } from '@service-soft/ngx-navigation/language-switcher';
import { SeoLocale } from '@service-soft/ngx-navigation/seo';

// the languages of the website, the one it is written in first, the same as the i18n of angular.json: each is built
// below its subPath, and with one language the website is at the root. Search engines and AI assistants get every page
// in each of them, see provideSeoConfig and server.ts
export const locales: SeoLocale[] = {{=locales}};

// the languages as the language switcher shows them, each by its name in itself, which is how its speakers find it
export const languages: LanguageSwitcherLanguage[] = {{=languages}};
