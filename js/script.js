document.addEventListener("DOMContentLoaded", function () {
    const mainScreen = document.getElementById("mainScreen");
    const btnFocused = document.getElementById("btn-focused");
    const btnOrganized = document.getElementById("btn-organized");
    const changeSelection = document.querySelector(".change-selection");

    btnFocused.addEventListener("click", function () {
        if (!btnFocused.classList.contains("selected")) {
            btnFocused.classList.add("selected");
            btnOrganized.classList.remove("selected");
            changeSelection.style.left = "4%";
            changeSelection.style.width = "160px";
            mainScreen.classList.toggle("stay-focused");
            mainScreen.classList.toggle("stay-organized");
        }
    });

    btnOrganized.addEventListener("click", function () {
        if (!btnOrganized.classList.contains("selected")) {
            btnOrganized.classList.add("selected");
            btnFocused.classList.remove("selected");
            changeSelection.style.left = "50%";
            changeSelection.style.width = "180px";
            mainScreen.classList.toggle("stay-focused");
            mainScreen.classList.toggle("stay-organized");
        }
    });

    const goBtn = document.getElementById("go-btn");

    goBtn.addEventListener("click", function () {
        const todosLosElementos = document.querySelectorAll(".main-screen *");

        todosLosElementos.forEach(elemento => {
            if (!elemento.classList.contains("info-btn") && !elemento.closest(".info-btn")) {
                elemento.style.transition = "all 1s";
                elemento.style.transform = "scale(0)";
            }
        });

        setInterval(cambiarDePantalla, 1000);
    });

    function cambiarDePantalla() {
        document.cookie = "typeScreen=" + mainScreen.classList[1] + ";";
        window.location.href = "pages\\stayIndex.html";
    }

});