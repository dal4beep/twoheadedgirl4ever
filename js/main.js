/* Small page effects: equalizer letters, footer typewriter, year. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- "NEW ALBUM COMING SOON" equalizer ----
  var eq = document.querySelector(".fx-equalizer");
  if (eq) {
    var phrase = eq.getAttribute("aria-label") || "";
    var words = phrase.split(" ");
    var idx = 0; // continuous index (spaces count) keeps the wave flowing across words
    words.forEach(function (word) {
      var group = document.createElement("span");
      group.className = "fx-word";
      for (var i = 0; i < word.length; i++) {
        var b = document.createElement("b");
        b.setAttribute("aria-hidden", "true");
        b.style.setProperty("--i", idx++ % 6);
        b.textContent = word[i];
        group.appendChild(b);
      }
      idx++;
      eq.appendChild(group);
    });
  }

  // ---- Footer typewriter ----
  function consoleText(words, id, colors) {
    if (!colors || !colors.length) colors = ["#fff"];
    var target = document.getElementById(id);
    var cursor = document.getElementById("console-cursor");
    if (!target) return;

    target.style.color = colors[0];

    if (reduceMotion) {
      target.textContent = words[0];
      return;
    }

    var letterCount = 1;
    var step = 1;
    var waiting = false;

    setInterval(function () {
      if (waiting) return;
      var word = words[0];

      if (letterCount === 0) {
        waiting = true;
        target.textContent = "";
        setTimeout(function () {
          colors.push(colors.shift());
          words.push(words.shift());
          target.style.color = colors[0];
          step = 1;
          letterCount = 1;
          waiting = false;
        }, 1000);
      } else if (letterCount === word.length + 1) {
        waiting = true;
        setTimeout(function () {
          step = -1;
          letterCount += step;
          waiting = false;
        }, 1000);
      } else {
        target.textContent = word.substring(0, letterCount);
        letterCount += step;
      }
    }, 120);

    if (cursor) {
      setInterval(function () { cursor.classList.toggle("hidden"); }, 400);
    }
  }

  consoleText(["Edited by Madeleine Haas"], "typewriter", ["tomato", "rebeccapurple", "lightblue"]);

  // ---- Copyright year ----
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
