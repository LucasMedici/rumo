/**
 * Inline script rendered in <head> (by the server) so the right theme class is set before the
 * first paint — no light flash for dark-mode users. Must stay tiny and dependency-free.
 * Keep the storage key and logic in sync with `lib/theme.ts`.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('rumo-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`
