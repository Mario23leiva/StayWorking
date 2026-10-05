// Tablero kanban: tareas guardadas en local, arrastrar y soltar, edición y tarea en foco
const Kanban = (() => {
    const STATUSES = ['todo', 'doing', 'done'];
    const CATEGORIES = {
        design: 'Diseño',
        development: 'Desarrollo',
        maintenance: 'Mantenimiento',
        testing: 'Testing',
        research: 'Investigación',
        documentation: 'Documentación',
        'project-management': 'Gestión',
        marketing: 'Marketing',
        finance: 'Finanzas',
        other: 'Otra',
    };

    let tasks = Store.get('tasks', null) ?? migrateLegacyTasks();
    let focusId = Store.get('focusTask', null);
    let editingId = null;
    let dragging = null;

    const lists = {};
    document.querySelectorAll('.task-list').forEach(list => { lists[list.dataset.status] = list; });
    const columns = document.querySelectorAll('.column');
    const carryNote = document.getElementById('carry-note');
    const clearDoneBtn = document.getElementById('clear-done');
    const quickAdd = document.getElementById('quick-add');
    const dialog = document.getElementById('task-dialog');
    const form = document.getElementById('task-form');
    const categoryPicker = document.getElementById('category-picker');

    // ---------- Datos ----------

    function uid() {
        return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    // Convierte las tareas de la versión anterior (guardadas como HTML) al nuevo formato
    function migrateLegacyTasks() {
        let old;
        try {
            old = JSON.parse(localStorage.getItem('tasksList')) || [];
        } catch (e) {
            old = [];
        }
        const parser = new DOMParser();
        const statusMap = { TODO: 'todo', DOING: 'doing', DONE: 'done' };
        const migrated = old.map(item => {
            const el = parser.parseFromString(item.html || '', 'text/html').body.firstElementChild;
            if (!el) return null;
            let category = /var\(--([\w-]+)\)/.exec(el.getAttribute('style') || '')?.[1] || 'other';
            if (category === 'proyect-management') category = 'project-management';
            const description = el.getAttribute('data-description');
            return {
                id: uid(),
                title: el.getAttribute('title') || el.textContent.trim() || 'Tarea',
                description: description && description !== 'null' ? description : '',
                category: CATEGORIES[category] ? category : 'other',
                status: statusMap[item.status] || 'todo',
                createdAt: Date.now(),
                doneAt: item.status === 'DONE' ? Date.now() : null,
                pomodoros: 0,
            };
        }).filter(Boolean);
        Store.set('tasks', migrated);
        return migrated;
    }

    function find(id) {
        return tasks.find(t => t.id === id);
    }

    function commit() {
        Store.set('tasks', tasks);
        render();
        document.dispatchEvent(new CustomEvent('sw:tasks-changed'));
    }

    function add({ title, description = '', category = 'other' }) {
        tasks.push({
            id: uid(),
            title,
            description,
            category,
            status: 'todo',
            createdAt: Date.now(),
            doneAt: null,
            pomodoros: 0,
        });
        commit();
    }

    function update(id, patch) {
        const task = find(id);
        if (!task) return;
        Object.assign(task, patch);
        commit();
    }

    function remove(id) {
        tasks = tasks.filter(t => t.id !== id);
        if (focusId === id) setFocus(null, false);
        commit();
    }

    // Mueve una tarea a una columna; si se indica beforeId queda justo encima de esa tarea
    function move(id, status, beforeId = null) {
        const task = find(id);
        if (!task) return;
        if (task.status !== status) {
            task.status = status;
            task.doneAt = status === 'done' ? Date.now() : null;
            if (status === 'done' && focusId === id) setFocus(null, false);
        }
        tasks.splice(tasks.indexOf(task), 1);
        const beforeIndex = beforeId ? tasks.findIndex(t => t.id === beforeId) : -1;
        if (beforeIndex >= 0) tasks.splice(beforeIndex, 0, task);
        else tasks.push(task);
        commit();
    }

    function setFocus(id, save = true) {
        focusId = id;
        Store.set('focusTask', id);
        if (save) commit();
    }

    function addPomodoro(id) {
        const task = find(id);
        if (task) update(id, { pomodoros: (task.pomodoros || 0) + 1 });
    }

    function doneToday() {
        const today = Store.startOfDay();
        return tasks.filter(t => t.status === 'done' && t.doneAt >= today).length;
    }

    // ---------- Pintado ----------

    function ageLabel(createdAt) {
        const days = Math.round((Store.startOfDay() - Store.startOfDay(createdAt)) / 86400000);
        if (days <= 0) return null;
        if (days === 1) return 'de ayer';
        return `hace ${days} días`;
    }

    function icon(name) {
        return `<svg class="icon"><use href="#i-${name}"/></svg>`;
    }

    function cardFor(task) {
        const li = document.createElement('li');
        li.className = 'task';
        li.draggable = true;
        li.tabIndex = 0;
        li.dataset.id = task.id;
        li.dataset.status = task.status;
        li.style.setProperty('--cat', `var(--cat-${task.category})`);
        li.classList.toggle('is-focus', task.id === focusId);

        const top = document.createElement('div');
        top.className = 'task-top';
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = CATEGORIES[task.category];
        top.appendChild(chip);
        const age = task.status !== 'done' && ageLabel(task.createdAt);
        if (age) {
            const ageEl = document.createElement('span');
            ageEl.className = 'age old';
            ageEl.textContent = age;
            top.appendChild(ageEl);
        }

        const title = document.createElement('p');
        title.className = 'task-title';
        title.textContent = task.title;

        li.append(top, title);

        if (task.description) {
            const desc = document.createElement('p');
            desc.className = 'task-desc';
            desc.textContent = task.description;
            li.appendChild(desc);
        }

        const foot = document.createElement('div');
        foot.className = 'task-foot';
        if (task.pomodoros) {
            const tomatoes = document.createElement('span');
            tomatoes.className = 'tomatoes';
            tomatoes.title = `${task.pomodoros} pomodoro${task.pomodoros === 1 ? '' : 's'}`;
            tomatoes.textContent = `× ${task.pomodoros}`;
            foot.appendChild(tomatoes);
        }

        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const index = STATUSES.indexOf(task.status);
        let html = '';
        if (task.status !== 'done') {
            const isFocus = task.id === focusId;
            html += `<button type="button" data-action="focus" aria-pressed="${isFocus}"
                title="${isFocus ? 'Quitar del foco' : 'Enfocarme en esta tarea'}"
                aria-label="${isFocus ? 'Quitar del foco' : 'Enfocarme en esta tarea'}">${icon('target')}</button>`;
        }
        if (index > 0) {
            html += `<button type="button" data-action="left" title="Mover a la izquierda" aria-label="Mover a la columna anterior">${icon('left')}</button>`;
        }
        if (index < STATUSES.length - 1) {
            html += `<button type="button" data-action="right" title="Mover a la derecha" aria-label="Mover a la columna siguiente">${icon('right')}</button>`;
        }
        actions.innerHTML = html;
        foot.appendChild(actions);
        li.appendChild(foot);

        return li;
    }

    function render() {
        STATUSES.forEach(status => {
            const items = tasks.filter(t => t.status === status);
            lists[status].replaceChildren(...items.map(cardFor));
            document.querySelector(`[data-count="${status}"]`).textContent = items.length;
        });

        clearDoneBtn.hidden = !tasks.some(t => t.status === 'done');

        const today = Store.startOfDay();
        const carried = tasks.filter(t => t.status !== 'done' && t.createdAt < today).length;
        carryNote.hidden = carried === 0;
        if (carried) {
            carryNote.innerHTML = `Tienes <strong>${carried}</strong> tarea${carried === 1 ? '' : 's'} pendiente${carried === 1 ? '' : 's'} de días anteriores`;
        }
    }

    // ---------- Diálogo de tarea ----------

    Object.entries(CATEGORIES).forEach(([value, label]) => {
        const option = document.createElement('label');
        option.style.setProperty('--cat', `var(--cat-${value})`);
        option.innerHTML = `<input type="radio" name="category" value="${value}"><span></span>`;
        option.querySelector('span').textContent = label;
        categoryPicker.appendChild(option);
    });

    function openDialog(id = null, presetTitle = '') {
        editingId = id;
        const task = id ? find(id) : null;
        form.reset();
        document.getElementById('task-dialog-title').textContent = task ? 'Editar tarea' : 'Nueva tarea';
        form.elements.title.value = task ? task.title : presetTitle;
        form.elements.description.value = task ? task.description : '';
        form.querySelector(`input[value="${task ? task.category : 'other'}"]`).checked = true;
        document.getElementById('delete-task').hidden = !task;

        const meta = document.getElementById('task-meta');
        if (task) {
            const created = new Date(task.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            meta.textContent = `Creada el ${created}` + (task.pomodoros ? ` · ${task.pomodoros} pomodoro${task.pomodoros === 1 ? '' : 's'}` : '');
        } else {
            meta.textContent = '';
        }

        dialog.showModal();
        form.elements.title.focus();
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        const data = {
            title: form.elements.title.value.trim(),
            description: form.elements.description.value.trim(),
            category: form.elements.category.value || 'other',
        };
        if (!data.title) return;
        if (editingId) update(editingId, data);
        else add(data);
        dialog.close();
    });

    document.getElementById('delete-task').addEventListener('click', () => {
        if (editingId && confirm('¿Eliminar esta tarea?')) {
            remove(editingId);
            dialog.close();
        }
    });

    document.getElementById('new-task-btn').addEventListener('click', () => openDialog());

    // ---------- Interacción con las tarjetas ----------

    quickAdd.addEventListener('submit', event => {
        event.preventDefault();
        const title = quickAdd.elements.title.value.trim();
        if (!title) return;
        add({ title });
        quickAdd.reset();
    });

    clearDoneBtn.addEventListener('click', () => {
        const count = tasks.filter(t => t.status === 'done').length;
        if (confirm(`¿Eliminar ${count} tarea${count === 1 ? '' : 's'} terminada${count === 1 ? '' : 's'}?`)) {
            tasks = tasks.filter(t => t.status !== 'done');
            commit();
        }
    });

    document.querySelector('.columns').addEventListener('click', event => {
        const card = event.target.closest('.task');
        if (!card) return;
        const id = card.dataset.id;
        const action = event.target.closest('[data-action]')?.dataset.action;
        const task = find(id);

        if (action === 'focus') {
            if (focusId === id) {
                setFocus(null);
            } else {
                setFocus(id, false);
                if (task.status === 'todo') move(id, 'doing');
                else commit();
            }
        } else if (action === 'left' || action === 'right') {
            const next = STATUSES[STATUSES.indexOf(task.status) + (action === 'left' ? -1 : 1)];
            move(id, next);
            lists[next].querySelector(`[data-id="${id}"]`)?.focus();
        } else if (!action) {
            openDialog(id);
        }
    });

    document.querySelector('.columns').addEventListener('keydown', event => {
        if (event.key === 'Enter' && event.target.classList.contains('task')) openDialog(event.target.dataset.id);
    });

    // ---------- Arrastrar y soltar ----------

    function cardAfter(list, y) {
        const cards = [...list.querySelectorAll('.task:not(.dragging)')];
        return cards.find(card => {
            const box = card.getBoundingClientRect();
            return y < box.top + box.height / 2;
        }) || null;
    }

    document.addEventListener('dragstart', event => {
        const card = event.target.closest?.('.task');
        if (!card) return;
        dragging = card;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.dataset.id);
        requestAnimationFrame(() => card.classList.add('dragging'));
    });

    document.addEventListener('dragend', () => {
        if (!dragging) return;
        dragging = null;
        columns.forEach(c => c.classList.remove('drag-over'));
        render();
    });

    columns.forEach(column => {
        const list = column.querySelector('.task-list');

        column.addEventListener('dragover', event => {
            if (!dragging) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            columns.forEach(c => c.classList.toggle('drag-over', c === column));
            const after = cardAfter(list, event.clientY);
            if (after) {
                if (after !== dragging.nextElementSibling) list.insertBefore(dragging, after);
            } else if (list.lastElementChild !== dragging) {
                list.appendChild(dragging);
            }
        });

        column.addEventListener('drop', event => {
            if (!dragging) return;
            event.preventDefault();
            const id = dragging.dataset.id;
            const beforeId = dragging.nextElementSibling?.dataset.id ?? null;
            dragging.classList.remove('dragging');
            dragging = null;
            column.classList.remove('drag-over');
            move(id, column.dataset.status, beforeId);
        });
    });

    // ---------- Atajo: N para nueva tarea ----------

    document.addEventListener('keydown', event => {
        if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return;
        event.preventDefault();
        quickAdd.elements.title.focus();
    });

    // Sincroniza si se edita en otra pestaña
    Store.onExternalChange('tasks', () => {
        tasks = Store.get('tasks', []);
        render();
        document.dispatchEvent(new CustomEvent('sw:tasks-changed'));
    });
    Store.onExternalChange('focusTask', () => {
        focusId = Store.get('focusTask', null);
        render();
        document.dispatchEvent(new CustomEvent('sw:tasks-changed'));
    });

    render();

    return {
        get focusId() { return focusId; },
        getTask: find,
        setFocus,
        addPomodoro,
        doneToday,
    };
})();
