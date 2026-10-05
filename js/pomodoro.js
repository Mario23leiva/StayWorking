// Temporizador pomodoro. Guarda la hora de fin (no un contador), así sobrevive a recargas
// y no se desfasa aunque la pestaña quede en segundo plano.
(() => {
    const DEFAULTS = { focus: 25, short: 5, long: 15, interval: 4, autoStart: false, sound: true, notify: false };
    const LABELS = { focus: 'Enfoque', short: 'Descanso', long: 'Descanso largo' };

    let settings = { ...DEFAULTS, ...legacyCookieSettings(), ...Store.get('settings', {}) };
    let state = Store.get('timer', null) || { mode: 'focus', remaining: settings.focus * 60, endAt: null, cycle: 0 };
    let stats = Store.get('stats', {});
    let lastRendered = '';

    const card = document.querySelector('.pomodoro');
    const timeEl = document.getElementById('time');
    const labelEl = document.getElementById('dial-label');
    const progress = document.getElementById('dial-progress');
    const toggleBtn = document.getElementById('toggle-btn');
    const cycleEl = document.getElementById('cycle');
    const focusEl = document.getElementById('focus-task');
    const modeButtons = document.querySelectorAll('.modes button');
    const alarm = document.getElementById('alarm');
    const settingsDialog = document.getElementById('settings-dialog');
    const settingsForm = document.getElementById('settings-form');

    const CIRCUMFERENCE = 2 * Math.PI * 90;
    progress.style.strokeDasharray = CIRCUMFERENCE;

    // Ajustes de la versión anterior, que se guardaban en cookies
    function legacyCookieSettings() {
        const cookies = Object.fromEntries(document.cookie.split(';').map(c => c.trim().split('=')));
        const map = { pomodoro: 'focus', shortBrake: 'short', longBrake: 'long', longBrakeInterval: 'interval' };
        const result = {};
        Object.entries(map).forEach(([oldKey, newKey]) => {
            const value = parseInt(cookies[oldKey], 10);
            if (value > 0) result[newKey] = value;
        });
        return result;
    }

    // ---------- Lógica ----------

    const duration = mode => settings[mode] * 60;
    const isRunning = () => state.endAt !== null;

    function remaining() {
        return isRunning() ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000)) : state.remaining;
    }

    function persist() {
        Store.set('timer', state);
    }

    function start() {
        if (isRunning()) return;
        if (state.remaining <= 0) state.remaining = duration(state.mode);
        state.endAt = Date.now() + state.remaining * 1000;
        persist();
        render();
    }

    function pause() {
        if (!isRunning()) return;
        state.remaining = remaining();
        state.endAt = null;
        persist();
        render();
    }

    function setMode(mode) {
        state.mode = mode;
        state.endAt = null;
        state.remaining = duration(mode);
        persist();
        render();
    }

    function nextMode(afterFocus) {
        if (state.mode !== 'focus') return 'focus';
        return afterFocus && state.cycle % settings.interval === 0 ? 'long' : 'short';
    }

    function complete({ silent = false } = {}) {
        const finished = state.mode;
        if (finished === 'focus') {
            state.cycle++;
            recordFocus(settings.focus);
            if (Kanban.focusId) Kanban.addPomodoro(Kanban.focusId);
        }
        setMode(nextMode(true));

        if (!silent) {
            if (settings.sound) {
                alarm.currentTime = 0;
                alarm.play().catch(() => { });
            }
            notify(finished);
            if (settings.autoStart) start();
        }
    }

    function recordFocus(minutes) {
        const key = Store.dayKey();
        const day = stats[key] || { pomodoros: 0, minutes: 0 };
        day.pomodoros++;
        day.minutes += minutes;
        stats[key] = day;
        Store.set('stats', stats);
    }

    function notify(finished) {
        if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
        const body = finished === 'focus' ? '¡Pomodoro terminado! Toca descansar.' : 'Descanso terminado. ¡A por el siguiente!';
        try {
            new Notification('StayWorking', { body, silent: true });
        } catch (e) { }
    }

    // ---------- Pintado ----------

    function format(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function render() {
        const left = remaining();
        const running = isRunning();
        const key = `${state.mode}|${left}|${running}|${state.cycle}|${settings.interval}`;
        if (key === lastRendered) return;
        lastRendered = key;

        timeEl.textContent = format(left);
        labelEl.textContent = running ? LABELS[state.mode] : (left < duration(state.mode) ? 'En pausa' : LABELS[state.mode]);
        progress.style.strokeDashoffset = CIRCUMFERENCE * (1 - left / duration(state.mode));
        card.classList.toggle('running', running);

        modeButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.mode)));

        toggleBtn.querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
        toggleBtn.querySelector('span').textContent = running ? 'Pausar' : (left < duration(state.mode) ? 'Seguir' : 'Empezar');

        const filled = state.mode === 'long' ? settings.interval : state.cycle % settings.interval;
        cycleEl.replaceChildren(...Array.from({ length: settings.interval }, (_, i) => {
            const dot = document.createElement('span');
            if (i < filled) dot.className = 'filled';
            return dot;
        }));
        cycleEl.setAttribute('aria-label', `${filled} de ${settings.interval} pomodoros hasta el descanso largo`);

        document.title = running ? `${format(left)} · ${LABELS[state.mode]} | StayWorking` : 'StayWorking';
    }

    function renderStats() {
        const today = stats[Store.dayKey()] || { pomodoros: 0, minutes: 0 };
        document.getElementById('stat-pomos').textContent = today.pomodoros;
        document.getElementById('stat-minutes').textContent = today.minutes;
        document.getElementById('stat-done').textContent = Kanban.doneToday();
    }

    function renderFocusTask() {
        const task = Kanban.focusId && Kanban.getTask(Kanban.focusId);
        focusEl.classList.toggle('has-task', Boolean(task));
        if (task) {
            focusEl.innerHTML = `<svg class="icon"><use href="#i-target"/></svg>
                <div class="focus-task-text"><small>Trabajando en</small><strong></strong></div>
                <button class="icon-btn small" type="button" aria-label="Quitar tarea del foco">
                    <svg class="icon"><use href="#i-close"/></svg></button>`;
            focusEl.querySelector('strong').textContent = task.title;
            focusEl.querySelector('button').addEventListener('click', () => Kanban.setFocus(null));
        } else {
            focusEl.innerHTML = `<svg class="icon"><use href="#i-target"/></svg>
                <span>Pulsa el icono de diana en una tarea para enfocarte en ella y contar sus pomodoros.</span>`;
        }
    }

    // ---------- Eventos ----------

    toggleBtn.addEventListener('click', () => {
        if (isRunning()) {
            pause();
        } else {
            alarm.pause();
            start();
        }
    });

    document.getElementById('reset-btn').addEventListener('click', () => setMode(state.mode));

    document.getElementById('skip-btn').addEventListener('click', () => setMode(nextMode(false)));

    modeButtons.forEach(btn => btn.addEventListener('click', () => {
        if (btn.dataset.mode === state.mode && !isRunning()) return;
        if (isRunning() && !confirm('El temporizador está en marcha. ¿Cambiar de modo y reiniciarlo?')) return;
        setMode(btn.dataset.mode);
    }));

    document.addEventListener('keydown', event => {
        if (event.code !== 'Space' || event.repeat) return;
        if (event.target.closest('input, textarea, select, button, [contenteditable], .task') || document.querySelector('dialog[open]')) return;
        event.preventDefault();
        toggleBtn.click();
    });

    document.addEventListener('sw:tasks-changed', () => {
        renderFocusTask();
        renderStats();
    });

    // Ajustes
    function fillSettingsForm(values) {
        const f = settingsForm.elements;
        ['focus', 'short', 'long', 'interval'].forEach(k => { f[k].value = values[k]; });
        ['autoStart', 'sound', 'notify'].forEach(k => { f[k].checked = values[k]; });
    }

    document.getElementById('settings-btn').addEventListener('click', () => {
        fillSettingsForm(settings);
        settingsDialog.showModal();
    });

    document.getElementById('settings-defaults').addEventListener('click', () => fillSettingsForm(DEFAULTS));

    settingsForm.elements.notify.addEventListener('change', async event => {
        if (!event.target.checked) return;
        if (!('Notification' in window)) {
            event.target.checked = false;
            alert('Este navegador no admite notificaciones.');
            return;
        }
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') event.target.checked = false;
        }
    });

    settingsForm.addEventListener('submit', event => {
        event.preventDefault();
        if (!settingsForm.reportValidity()) return;
        const f = settingsForm.elements;
        const previous = settings;
        settings = {
            focus: parseInt(f.focus.value, 10),
            short: parseInt(f.short.value, 10),
            long: parseInt(f.long.value, 10),
            interval: parseInt(f.interval.value, 10),
            autoStart: f.autoStart.checked,
            sound: f.sound.checked,
            notify: f.notify.checked,
        };
        Store.set('settings', settings);
        // Si el modo actual no ha empezado, se aplica la nueva duración
        if (!isRunning() && state.remaining === previous[state.mode] * 60) setMode(state.mode);
        lastRendered = '';
        render();
        settingsDialog.close();
    });

    // Otra pestaña cambió el temporizador o los ajustes
    Store.onExternalChange('timer', () => {
        state = Store.get('timer', state);
        render();
    });
    Store.onExternalChange('settings', () => {
        settings = { ...DEFAULTS, ...Store.get('settings', {}) };
        lastRendered = '';
        render();
    });
    Store.onExternalChange('stats', () => {
        stats = Store.get('stats', {});
        renderStats();
    });

    // ---------- Arranque ----------

    // Si terminó mientras la página estaba cerrada, se cuenta sin sonar
    if (isRunning() && remaining() <= 0) complete({ silent: true });

    let currentDay = Store.dayKey();
    setInterval(() => {
        if (isRunning() && remaining() <= 0) {
            // Si otra pestaña ya lo ha completado, no se cuenta dos veces
            const saved = Store.get('timer', state);
            if (saved.endAt !== state.endAt) {
                state = saved;
                return render();
            }
            state.endAt = null;
            state.remaining = 0;
            complete();
            renderStats();
        }
        render();
        // Al pasar la medianoche se reinician las estadísticas del día
        if (Store.dayKey() !== currentDay) {
            currentDay = Store.dayKey();
            renderStats();
        }
    }, 250);

    render();
    renderStats();
    renderFocusTask();
})();
