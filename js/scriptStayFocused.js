document.addEventListener("DOMContentLoaded", function () {

    // const todosLosElementos = document.querySelectorAll(".main-screen *");

    // todosLosElementos.forEach(elemento => {
    //     if (!elemento.classList.contains("info-btn") && !elemento.closest(".info-btn")) {
    //         elemento.style.transform = "scale(0)";
    //     }
    // });

    // setInterval(cargarDocumento, 500);




    const audio = new Audio('../resources/alarm.mp3');


    let timerInterval;

    let longBrakeInterval = getCookie("longBrakeInterval") || document.getElementById("longBrakeInterval").getAttribute("data-default");
    document.getElementById("longBrakeInterval").value = longBrakeInterval;
    let pomodoroTimer;
    let shortBrakeTimer;
    let longBrakeTimer;

    let activeTimer;
    let actualTimerValue;
    let timerStatus = false;
    let timerStatusValue;

    function cargarDocumento() {

        todosLosElementos.forEach(elemento => {
            if (!elemento.classList.contains("info-btn") && !elemento.closest(".info-btn")) {
                elemento.style.transition = "0.5s";
                elemento.style.transform = "scale(1)";
            }
        });
    }



    const mainScreen = document.getElementById("contentMainScreen");
    const btnFocused = document.getElementById("btn-focused");
    const btnOrganized = document.getElementById("btn-organized");
    const changeSelection = document.querySelector(".change-selection");

    btnFocused.addEventListener("click", function () {
        if (!btnFocused.classList.contains("selected")) {
            btnFocused.classList.add("selected");
            btnOrganized.classList.remove("selected");
            changeSelection.style.left = "4%";
            changeSelection.style.width = "94px";
            mainScreen.classList.toggle("stay-focused");
            mainScreen.classList.toggle("stay-organized");
            setCookie('typeScreen', 'stay-focused');
        }
    });

    btnOrganized.addEventListener("click", function () {
        if (!btnOrganized.classList.contains("selected")) {
            btnOrganized.classList.add("selected");
            btnFocused.classList.remove("selected");
            changeSelection.style.left = "50%";
            changeSelection.style.width = "115px";
            mainScreen.classList.toggle("stay-focused");
            mainScreen.classList.toggle("stay-organized");
            setCookie('typeScreen', 'stay-organized');
        }
    });

    function changeScreen(type) {
        if (type == "stay-focused") {
            btnFocused.click();
        } else if (type == "stay-organized") {
            btnOrganized.click();
        }
    }





    //POMODORO LOGICAL

    function getValues() {
        const pomodoroValue = getCookie("pomodoro") || document.getElementById("pomodoro").getAttribute("data-default");
        const shortBrakeValue = getCookie("shortBrake") || document.getElementById("shortBrake").getAttribute("data-default");
        const longBrakeValue = getCookie("longBrake") || document.getElementById("longBrake").getAttribute("data-default");


        return [pomodoroValue, shortBrakeValue, longBrakeValue];
    }


    function loadPomodoro() {
        const [pomodoroValue, shortBrakeValue, longBrakeValue] = getValues();

        pomodoroTimer = document.getElementById("pomodoroTimer");
        pomodoroTimer.setAttribute("data-timer", pomodoroValue);
        pomodoroTimer.innerHTML = `${pomodoroValue}:00`;

        shortBrakeTimer = document.getElementById("shortBrakeTimer");
        shortBrakeTimer.setAttribute("data-timer", shortBrakeValue);
        shortBrakeTimer.innerHTML = `${shortBrakeValue}:00`;

        longBrakeTimer = document.getElementById("longBrakeTimer");
        longBrakeTimer.setAttribute("data-timer", longBrakeValue);
        longBrakeTimer.innerHTML = `${longBrakeValue}:00`;

        document.getElementById("pomodoro").value = pomodoroValue;
        document.getElementById("shortBrake").value = shortBrakeValue;
        document.getElementById("longBrake").value = longBrakeValue;

    }

    const goBtn = document.getElementById("btnTimerGO");
    goBtn.addEventListener("click", function () {
        audio.pause();
        audio.currentTime = 0;
        startTimer();
    });

    loadPomodoro();

    const optionsTimer = document.querySelectorAll(".options-timer h3");
    const optionsTimerValues = document.querySelectorAll(".time-timer");

    optionsTimer.forEach(element => {

        if (element.classList.contains("active")) {
            checkTimerValue(element.classList[0], optionsTimerValues);
        }

        element.addEventListener("click", function () {
            // Remover la clase "active" de todos los elementos
            optionsTimer.forEach(item => {
                item.classList.remove("active");
            });

            checkTimerValue(this.classList[0], optionsTimerValues);

            // Agregar la clase "active" al elemento clicado
            this.classList.add("active");

        });
    });

    function checkTimerValue(classElementClicked, optionsTimerValues) {
        optionsTimerValues.forEach(element => {
            if (element.classList.contains(classElementClicked)) {
                element.classList.add("active");
                element.style.display = "block";
                actualTimerValue = element.getAttribute("data-timer");
                activeTimer = element;
                timerStatusValue = actualTimerValue * 60;
                goBtn.textContent = "GO";
                timerStatus = false;
                loadPomodoro();
            } else {
                element.classList.remove("active");
                element.style.display = "none";
            }
        });
    }

    function updateTimer() {
        if (!timerStatus) {
            clearInterval(timerInterval);
        } else {
            timerStatusValue--;
            activeTimer.innerHTML = `${Math.floor(timerStatusValue / 60)}:${(timerStatusValue % 60).toString().padStart(2, "0")}`
            if (timerStatusValue <= 0) {
                timerStatus = false;
                timerStatusValue = 0;
                audio.play();
                clearInterval();
                changeTimerSelection();
            }
        }
    }

    function startTimer() {
        if (!timerStatus) {
            timerStatus = true;

            timerInterval = setInterval(() => {
                updateTimer();
            }, 1000);

            goBtn.textContent = "PAUSE";
        } else {
            clearInterval(timerInterval);
            timerStatus = false;
            goBtn.textContent = "GO";
        }
    }


    function changeTimerSelection() {
        if (activeTimer.id == 'pomodoroTimer' && longBrakeInterval != 0) {
            longBrakeInterval--;
            document.getElementById('shortBrakeTimerValue').click();
        } else if (activeTimer.id == 'shortBrakeTimer') {
            document.getElementById('pomodoroTimerValue').click();
        } else {
            longBrakeInterval = document.getElementById("longBrakeInterval").value;
            document.getElementById('longBrakeTimerValue').click();
        }
    }


    document.getElementById("btn-timer-save").addEventListener("click", function () {

        const pomodoroValue = document.getElementById("pomodoro").value;
        const shortBrakeValue = document.getElementById("shortBrake").value;
        const longBrakeValue = document.getElementById("longBrake").value;
        const longBrakeIntervalValue = document.getElementById("longBrakeInterval").value;

        setCookie('pomodoro', pomodoroValue);
        setCookie('shortBrake', shortBrakeValue);
        setCookie('longBrake', longBrakeValue);
        setCookie('longBrakeInterval', longBrakeIntervalValue);

        loadPomodoro();
        window.location.reload();
    });

    document.getElementById("btn-timer-reset").addEventListener("click", function () {

        setCookie('pomodoro', document.getElementById("pomodoro").getAttribute("data-default"));
        setCookie('shortBrake', document.getElementById("shortBrake").getAttribute("data-default"));
        setCookie('longBrake', document.getElementById("longBrake").getAttribute("data-default"));
        setCookie('longBrakeInterval', document.getElementById("longBrakeInterval").getAttribute("data-default"));

        loadPomodoro();
        window.location.reload();

    });

    // SET COOKIE
    function setCookie(name, value) {
        document.cookie = `${name}=${value}`;
    }

    // GET COOKIE
    function getCookie(name) {
        const cookies = document.cookie.split(";").map(cookie => cookie.trim());
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split("=");
            if (cookieName === name) {
                return cookieValue;
            }
        }
        return null;
    }

    window.addEventListener('beforeunload', function (event) {
        event.preventDefault();

        if (timerStatus == true) {

            var mensaje = 'If you leave now, the timer will be reset. Are you sure you want to leave?';
            var eleccion = window.confirm(mensaje);

            if (eleccion) {
                window.location.reload();
            }
            
        }

    });

    changeScreen(getCookie('typeScreen'));

});