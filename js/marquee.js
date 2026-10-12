/* Liquid WebGL marquee: scrolling text rendered as a 2D mask,
   then filled with animated contour-line "fluid" in a shader. */
(function () {
  "use strict";

  var FAMILY = '"Unbounded", sans-serif';
  var FONT_LOAD = '900 40px "Unbounded"';
  var SCROLL_SPEED = 60; // CSS px per second
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VERT_SRC = [
    "attribute vec2 a_pos;",
    "varying vec2 v_uv;",
    "void main() {",
    "  v_uv = a_pos * 0.5 + 0.5;",
    "  gl_Position = vec4(a_pos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG_SRC = [
    "precision highp float;",
    "varying vec2 v_uv;",
    "uniform sampler2D u_mask;",
    "uniform float u_time;",
    "uniform float u_aspect;",
    "const vec3 FILL = vec3(0.765, 0.518, 1.0);",
    "const vec3 GLOW = vec3(1.0, 1.0, 1.0);",
    "float tri(float x) { return abs(fract(x + 0.5) - 0.5) * 2.0; }",
    "void main() {",
    "  vec2 uv = v_uv;",
    "  vec2 p = vec2(uv.x * u_aspect, uv.y);",
    "  float t = u_time * 0.3;",
    "  float inside = texture2D(u_mask, uv).r;",
    "  float mask = smoothstep(0.38, 0.62, inside);",
    "  float r = 0.015;",
    "  float g = 0.0;",
    "  g += texture2D(u_mask, uv + vec2( r,  r)).r;",
    "  g += texture2D(u_mask, uv + vec2(-r,  r)).r;",
    "  g += texture2D(u_mask, uv + vec2( r, -r)).r;",
    "  g += texture2D(u_mask, uv + vec2(-r, -r)).r;",
    "  float glowMask = smoothstep(0.1, 0.5, g * 0.25);",
    "  float a = max(mask, glowMask * 0.4);",
    "  if (a < 0.01) { gl_FragColor = vec4(0.0); return; }",
    "  float h = 0.0;",
    "  h += 1.0  * sin(2.4 * p.x + 0.9 * p.y + t * 1.15);",
    "  h += 0.82 * sin(-1.3 * p.x + 2.6 * p.y - t * 0.87);",
    "  h += 0.65 * sin(1.7 * p.x - 2.0 * p.y + t * 1.41);",
    "  h += 0.14 * sin(5.6 * p.x + 4.4 * p.y + t * 1.1 + h * 0.8);",
    "  float bands = tri(h * 9.0 * 0.5);",
    "  float onLine = 1.0 - smoothstep(0.205, 0.235, bands);",
    "  vec3 fluid = mix(FILL, vec3(0.0), onLine);",
    "  vec3 col = mix(GLOW * 0.7, fluid, mask);",
    "  gl_FragColor = vec4(col, a);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function fitFont(ctx, text, W, H) {
    var base = 100;
    ctx.font = "900 " + base + "px " + FAMILY;
    var w = ctx.measureText(text).width || 1;
    var byHeight = H * 0.65;
    var byWidth = (W * 0.95) * base / w;
    var size = Math.max(12, Math.min(byHeight, byWidth));
    ctx.font = "900 " + size + "px " + FAMILY;
    return { size: size, textW: ctx.measureText(text).width };
  }

  function createRow(el) {
    var text = el.getAttribute("data-text") || "";

    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false
    });
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.uniform1i(gl.getUniformLocation(prog, "u_mask"), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    el.appendChild(canvas);

    var mask = document.createElement("canvas");
    return {
      el: el,
      text: text,
      canvas: canvas,
      gl: gl,
      tex: tex,
      uTime: gl.getUniformLocation(prog, "u_time"),
      uAspect: gl.getUniformLocation(prog, "u_aspect"),
      mask: mask,
      mctx: mask.getContext("2d"),
      font: { size: 0, textW: 0 },
      gap: 0,
      dpr: 1,
      W: 0,
      H: 0,
      visible: true
    };
  }

  function resizeRow(row) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(1, Math.round(row.el.clientWidth * dpr));
    var H = Math.max(1, Math.round(row.el.clientHeight * dpr));
    if (W === row.W && H === row.H && dpr === row.dpr) return;

    row.W = W;
    row.H = H;
    row.dpr = dpr;
    row.canvas.width = W;
    row.canvas.height = H;
    row.mask.width = W;
    row.mask.height = H;
    row.gl.viewport(0, 0, W, H);
    row.gl.uniform1f(row.uAspect, W / H);

    row.font = fitFont(row.mctx, row.text, W, H);
    row.gap = row.font.size * 1.2;
  }

  function drawMask(row, t) {
    var c = row.mctx;
    var W = row.W, H = row.H;

    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    c.fillStyle = "#fff";
    c.font = "900 " + row.font.size + "px " + FAMILY;
    c.textAlign = "left";
    c.textBaseline = "middle";

    var period = row.font.textW + row.gap;
    var shift = reduceMotion ? 0 : (t * SCROLL_SPEED * row.dpr) % period;

    for (var x = shift - period; x < W; x += period) {
      c.fillText(row.text, x, H / 2);
    }
  }

  function renderRow(row, t) {
    var gl = row.gl;
    drawMask(row, t);
    gl.bindTexture(gl.TEXTURE_2D, row.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, row.mask);
    gl.uniform1f(row.uTime, t);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  var rows = [];
  var startTime = performance.now();

  function frame(now) {
    var t = (now - startTime) / 1000;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].visible) renderRow(rows[i], t);
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  function init() {
    var els = document.querySelectorAll(".marquee-row");
    for (var i = 0; i < els.length; i++) {
      var row = createRow(els[i]);
      if (row) {
        resizeRow(row);
        rows.push(row);
      } else {
        els[i].classList.add("no-webgl");
      }
    }
    if (!rows.length) return;

    function onResize() {
      rows.forEach(resizeRow);
      if (reduceMotion) frame(performance.now());
    }

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(onResize);
      rows.forEach(function (r) { ro.observe(r.el); });
    } else {
      window.addEventListener("resize", onResize);
    }

    // Skip rendering rows that are scrolled out of view
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          rows.forEach(function (r) {
            if (r.el === e.target) r.visible = e.isIntersecting;
          });
        });
      });
      rows.forEach(function (r) { io.observe(r.el); });
    }

    requestAnimationFrame(frame);
  }

  var fontReady = (document.fonts && document.fonts.load)
    ? document.fonts.load(FONT_LOAD)
    : Promise.resolve();

  Promise.resolve(fontReady).then(init, init);
})();
