document.addEventListener("DOMContentLoaded", function () {

    const TODO_STATUS = "TODO";
    const DOING_STATUS = "DOING";
    const DONE_STATUS = "DONE";


    document.getElementById("btn-tasks-add").addEventListener("click", function () {
        const titleTasks = document.getElementById("title-tasks").value;
        const descriptionTasks = document.getElementById("description-tasks").value;
        const categoryTasks = document.getElementById("category-tasks").value;
        createTasks(titleTasks, descriptionTasks, categoryTasks);

    });

    function createTasks(title, description = null, category) {
        const board = document.querySelector('.kanban-board-todo-content');
        const count = document.querySelectorAll('.tasks').length;
        const newTask = document.createElement('div');
        newTask.style.backgroundColor = `var(--${category})`;
        newTask.id = 'tasks' + count;
        newTask.className = 'tasks';
        newTask.draggable = true;
        newTask.title = title;
        newTask.setAttribute('data-bs-target', "#showDescriptionTask");
        newTask.setAttribute('data-bs-toggle', 'modal');
        newTask.setAttribute('data-status', TODO_STATUS);
        newTask.setAttribute('data-description', description);

        const textContainer = document.createElement('div');
        textContainer.className = 'text-container';
        textContainer.textContent = title;

        newTask.appendChild(textContainer);

        board.appendChild(newTask);

        saveTasks();
    }

    function dragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        const id = e.dataTransfer.getData('text/plain');
        const draggable = document.getElementById(id);
        if (e.target.classList.contains("board-content")) {
            e.target.appendChild(draggable);
            if (e.target.classList.contains("kanban-board-todo-content")) {
                updateTask(id, TODO_STATUS);
            } else if (e.target.classList.contains("kanban-board-doing-content")) {
                updateTask(id, DOING_STATUS);
            } else if (e.target.classList.contains("kanban-board-done-content")) {
                updateTask(id, DONE_STATUS);
            }
        }

    }

    function updateTask(idTask, statusTask) {
        const task = document.getElementById(idTask);
        task.setAttribute('data-status', statusTask);
        saveTasks();
    }


    function saveTasks() {
        const tasksList = [];
        const tasks = document.querySelectorAll('.tasks');
        tasks.forEach(element => {
            const taskObject = {
                html: element.outerHTML,
                status: element.getAttribute('data-status')
            };

            tasksList.push(taskObject);
        });

        localStorage.setItem('tasksList', JSON.stringify(tasksList));

        loadTasks();
    }


    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasksList')) || [];
        appendDraggableTasks(tasks);
    }

    function setDraggableBoard() {
        const draggableSpaces = document.querySelectorAll('.board-content');
        draggableSpaces.forEach(function (draggableSpace) {
            draggableSpace.addEventListener('dragover', dragOver);
            draggableSpace.addEventListener('drop', drop);
        });
    }

    function addDragStartEventListener() {
        const tasks = document.querySelectorAll('.tasks');
        tasks.forEach(function (task) {
            task.addEventListener('dragstart', dragStart);
        })
    }

    function appendDraggableTasks(tasks) {
        if (tasks.length > 0) {
            const toDoColumn = document.getElementById('toDo');
            const doingColumn = document.getElementById('doing');
            const doneColumn = document.getElementById('done');
            const toDoBoard = toDoColumn.querySelector('.board-content');
            toDoBoard.innerHTML = '';
            const doingBoard = doingColumn.querySelector('.board-content');
            doingBoard.innerHTML = '';
            const doneBoard = doneColumn.querySelector('.board-content');
            doneBoard.innerHTML = '';

            tasks.forEach(function (taskObject) {

                if (taskObject.status === TODO_STATUS) {
                    toDoBoard.innerHTML += taskObject.html;
                } else if (taskObject.status === DOING_STATUS) {
                    doingBoard.innerHTML += taskObject.html;
                } else if (taskObject.status === DONE_STATUS) {
                    doneBoard.innerHTML += taskObject.html;
                }

            });

            addDragStartEventListener();
        }
    }




    const descriptionModal = document.getElementById('showDescriptionTask')

    if (descriptionModal) {
        descriptionModal.addEventListener('show.bs.modal', event => {

            const title = event.relatedTarget;
            const description = event.relatedTarget.getAttribute('data-description');

            const modalTitle = descriptionModal.querySelector('.modal-title');
            const modalBody = descriptionModal.querySelector('.modal-body');

            modalTitle.textContent = title.innerText;
            modalBody.textContent = description;

        })
    }

    

    setDraggableBoard();
    loadTasks();

});