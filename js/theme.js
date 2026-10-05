// Selector de color de la ventana
(() => {
    const THEMES = [
        { id: 'lavanda', name: 'Lavanda', bg: '#EEE8F7', accent: '#B9A3DC' },
        { id: 'menta', name: 'Menta', bg: '#E5F3F1', accent: '#8CCBC3' },
        { id: 'melocoton', name: 'Melocotón', bg: '#FCEDE4', accent: '#F4B79A' },
        { id: 'rosa', name: 'Rosa', bg: '#FBEAF0', accent: '#EEA8C0' },
        { id: 'cielo', name: 'Cielo', bg: '#E6F0FB', accent: '#A3C6EC' },
        { id: 'limon', name: 'Limón', bg: '#FBF5DC', accent: '#EBD57A' },
        { id: 'pistacho', name: 'Pistacho', bg: '#EDF5E3', accent: '#B5D69A' },
        { id: 'nube', name: 'Nube', bg: '#F1EEEA', accent: '#CFC3B5' },
        { id: 'noche', name: 'Noche', bg: '#23212E', accent: '#9C88C4' },
    ];

    const button = document.getElementById('theme-btn');
    const menu = document.getElementById('theme-menu');
    const swatches = document.getElementById('swatches');
    const metaColor = document.querySelector('meta[name="theme-color"]');

    let current = Store.get('theme', 'lavanda');
    if (!THEMES.some(t => t.id === current)) current = 'lavanda';

    THEMES.forEach(theme => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'swatch';
        swatch.dataset.theme = theme.id;
        swatch.style.setProperty('--sw-bg', theme.bg);
        swatch.style.setProperty('--sw-accent', theme.accent);
        swatch.innerHTML = '<span class="swatch-dot"></span>';
        swatch.append(theme.name);
        swatch.addEventListener('click', () => apply(theme.id));
        swatches.appendChild(swatch);
    });

    function apply(id) {
        current = id;
        document.documentElement.dataset.theme = id;
        Store.set('theme', id);
        const theme = THEMES.find(t => t.id === id);
        metaColor.setAttribute('content', theme.bg);
        swatches.querySelectorAll('.swatch').forEach(s => {
            s.setAttribute('aria-pressed', String(s.dataset.theme === id));
        });
    }

    function setOpen(open) {
        menu.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        if (open) swatches.querySelector('[aria-pressed="true"]')?.focus();
    }

    button.addEventListener('click', () => setOpen(menu.hidden));

    document.addEventListener('click', event => {
        if (!menu.hidden && !event.target.closest('.theme-picker')) setOpen(false);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !menu.hidden) {
            setOpen(false);
            button.focus();
        }
    });

    Store.onExternalChange('theme', () => apply(Store.get('theme', 'lavanda')));

    apply(current);

    // Fecha de hoy en la cabecera
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('today').textContent = today.charAt(0).toUpperCase() + today.slice(1);

    // Ayuda
    const helpDialog = document.getElementById('help-dialog');
    document.getElementById('help-btn').addEventListener('click', () => helpDialog.showModal());

    // Cualquier botón [data-close] cierra su diálogo; clic en el fondo también
    document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', event => {
            if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
        });
    });
})();
