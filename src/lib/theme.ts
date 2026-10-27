export const THEME_STORAGE_KEY = 'theme';

// Se ejecuta en <head> antes del primer paint para evitar el flash de tema claro.
// Sin preferencia guardada, sigue al sistema operativo.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
