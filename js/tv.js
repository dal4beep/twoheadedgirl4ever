/* THG TV Network — 1978 wood-grain console with channel + volume knobs. */
(function () {
  "use strict";

  var CDN_VIDEO = "https://video.squarespace-cdn.com/content/v1/6ac45e1cf0ed615dbaa139df/";
  var CDN_IMAGE = "https://images.squarespace-cdn.com/content/v1/6ac45e1cf0ed615dbaa139df/";

  // Add, remove or reorder channels here.
  var channels = [
    { label: "CH 1 // PUÑETA",  type: "video", url: CDN_VIDEO + "861453b4-963a-4ab2-851b-75735e95323f/1920w" },
    { label: "CH 2 // WOLF",    type: "video", url: CDN_VIDEO + "f0362fa2-e6d0-4b5d-8bec-7d3d6584c88c/1920w" },
    { label: "CH 3 // WEPA",    type: "video", url: CDN_VIDEO + "509e9ec0-ecff-4f2c-be26-571c0f21d524/1920w" },
    { label: "CH 4 // LIVE",    type: "video", url: CDN_VIDEO + "0e23bc94-9fe5-40dc-9327-ef12e971ce85/1920w" },
    { label: "CH 5 // PLANETS", type: "image", url: CDN_IMAGE + "ab3bbdb8-cd05-49fa-8b16-7eda13415a4d/2hg-+styled+planets-+2SEC.gif" },
    { label: "CH 6 // BONUS",   type: "image", url: CDN_IMAGE + "5e8617c5-5c9f-441b-856b-e249f6056aaa/thg-company-photo.png" }
  ];

  var tvImage = document.getElementById("tv-image");
  var tvVideo = document.getElementById("tv-video");
  var osdChannel = document.getElementById("osd-channel");
  var channelDisplay = document.getElementById("channel-display");
  var staticOverlay = document.getElementById("static-overlay");
  var channelKnob = document.getElementById("channel-knob");
  var volumeKnob = document.getElementById("volume-knob");
  if (!tvImage || !tvVideo || !channelKnob || !volumeKnob) return;

  var currentChannel = -1; // -1 = standby (band photo)
  var knobAngle = 0;
  var isMuted = true;
  var switchTimer = null;

  // ---- Mechanical click via Web Audio (one shared context) ----
  var audioCtx = null;
  function playMechanicalClick() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // Web Audio unavailable — stay silent.
    }
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function switchChannel(index) {
    var n = channels.length;
    index = ((index % n) + n) % n;
    var dir = index === (currentChannel + 1) % n || currentChannel === -1 ? 1 : -1;
    currentChannel = index;
    var channel = channels[index];

    knobAngle += dir * (360 / n);
    channelKnob.style.setProperty("--angle", knobAngle + "deg");

    staticOverlay.classList.add("on");
    clearTimeout(switchTimer);

    switchTimer = setTimeout(function () {
      osdChannel.textContent = channel.label;
      channelDisplay.textContent = "CHANNEL " + pad(index + 1);

      if (channel.type === "video") {
        tvImage.hidden = true;
        tvVideo.hidden = false;
        tvVideo.muted = isMuted;
        tvVideo.src = channel.url;
        var p = tvVideo.play();
        if (p && p.catch) p.catch(function () { /* autoplay blocked */ });
      } else {
        tvVideo.pause();
        tvVideo.removeAttribute("src");
        tvVideo.load();
        tvVideo.hidden = true;
        tvImage.hidden = false;
        tvImage.src = channel.url;
        tvImage.alt = "Two Headed Girl — " + channel.label;
      }

      setTimeout(function () { staticOverlay.classList.remove("on"); }, 150);
    }, 180);
  }

  channelKnob.addEventListener("click", function () {
    playMechanicalClick();
    switchChannel(currentChannel + 1);
  });

  // Right-click the knob to go back a channel
  channelKnob.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    playMechanicalClick();
    switchChannel(currentChannel < 0 ? channels.length - 1 : currentChannel - 1);
  });

  channelKnob.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      playMechanicalClick();
      switchChannel(currentChannel + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      playMechanicalClick();
      switchChannel(currentChannel < 0 ? channels.length - 1 : currentChannel - 1);
    }
  });

  volumeKnob.addEventListener("click", function () {
    playMechanicalClick();
    isMuted = !isMuted;
    tvVideo.muted = isMuted;
    volumeKnob.setAttribute("aria-pressed", String(!isMuted));
    volumeKnob.style.setProperty("--angle", (isMuted ? 0 : 135) + "deg");
    // Turning up the volume while on standby tunes into channel 1
    if (!isMuted && currentChannel === -1) switchChannel(0);
  });

  // Pause video when the TV is scrolled off-screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var onScreen = entries[0].isIntersecting;
      if (tvVideo.hidden || !tvVideo.src) return;
      if (onScreen) {
        var p = tvVideo.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        tvVideo.pause();
      }
    }, { threshold: 0.1 }).observe(tvVideo.parentNode);
  }
})();
