// Accordion: toggle each panel independently (multi-expand, all toggleable).
document.addEventListener("DOMContentLoaded", function () {
  var headers = document.querySelectorAll(".accordion .accordion-navigation > a");
  headers.forEach(function (header) {
    // Reflect each panel's initial state onto its header (for the SVG arrow swap).
    var panel = header.parentElement.querySelector(".content");
    if (panel && panel.classList.contains("active")) {
      header.classList.add("active");
    }
    header.addEventListener("click", function (e) {
      e.preventDefault();
      if (!panel) return;
      panel.classList.toggle("active");
      header.classList.toggle("active");
    });
  });
});
