document.addEventListener("DOMContentLoaded", function () {
    if (window.self === window.top) {
        document.body.classList.add("standalone");
    }
});