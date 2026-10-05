// Guardado local (localStorage) con prefijo propio y JSON.
// Si el navegador bloquea el almacenamiento, la app sigue funcionando en memoria.
const Store = (() => {
    const PREFIX = 'stayworking:';

    function get(key, fallback) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (e) { }
    }

    // Avisa cuando otra pestaña cambia una clave
    function onExternalChange(key, callback) {
        window.addEventListener('storage', event => {
            if (event.key === PREFIX + key) callback();
        });
    }

    function dayKey(date = new Date()) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function startOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    return { get, set, onExternalChange, dayKey, startOfDay };
})();
