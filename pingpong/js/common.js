// Shared helpers for Ping Pong games
// Expose global PP namespace
window.PP = window.PP || {};

// Internal constants
PP.INTERNAL_WIDTH = 800;
PP.INTERNAL_HEIGHT = 500;

// Ball class: accepts optional base speed parameters
PP.Ball = class {
  constructor(opts = {}) {
    const size = opts.size || 15;
    this.size = size;
    this.x = PP.INTERNAL_WIDTH / 2 - size / 2;
    this.y = PP.INTERNAL_HEIGHT / 2 - size / 2;
    const baseSpeed = ('baseSpeed' in opts) ? opts.baseSpeed : (4 + Math.random() * 2);
    let angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * baseSpeed;
    if (Math.abs(this.vx) < 2) this.vx = 2 * Math.sign(this.vx || 1);
    this.vy = Math.sin(angle) * baseSpeed;
  }
};

// Utility: reflect predicted Y when hitting top/bottom (mirror method)
PP.reflectPrediction = function(pred, ballSize, canvasHeight) {
  let max = canvasHeight - ballSize;
  while (pred < 0 || pred > max) {
    if (pred < 0) pred = -pred;
    else pred = 2 * max - pred;
  }
  return pred;
};

// Fit canvas display size (we keep internal resolution constant for logic)
PP.fitCanvasToCSS = function(canvas) {
  // Keep internal resolution fixed; canvas width/height in attributes already set
  // Only set CSS width to container width for responsiveness (keeps sharpness acceptable)
  const containerWidth = canvas.parentElement.clientWidth;
  canvas.style.width = Math.min(containerWidth, 900) + 'px';
  // height will auto-scale based on internal aspect ratio (800x500)
};

// Input helpers: keyboard flags and pointer button wiring
PP.Input = {
  keys: {},
  // initialize keyboard handling, returns keys object
  initKeyboard: function() {
    const keys = this.keys;
    // store keys using a normalized lowercase name for consistent lookup
    window.addEventListener('keydown', (e) => {
      // normalize: single character -> lowercase, special keys -> lowercase (e.g., "ArrowUp" -> "arrowup")
      const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : (String(e.key || '').toLowerCase());
      keys[k] = true;
      // prevent arrow keys/space default scrolling behavior
      if (['arrowup','arrowdown',' ' , ' '].includes(k)) e.preventDefault();
    }, {passive: false});
    window.addEventListener('keyup', (e) => {
      const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : (String(e.key || '').toLowerCase());
      keys[k] = false;
    });
    return keys;
  },

  // Setup pointer/touch buttons; buttonConfigs: [{id, onDown}]
  // onDown will be called with true on press and false on release
  setupButtons: function(buttonConfigs) {
    buttonConfigs.forEach(cfg => {
      const btn = document.getElementById(cfg.id);
      if (!btn) return;
      const onDownSetter = (v) => { try { cfg.onDown(v); } catch (_) {} };

      function pointerDown(e) {
        e.preventDefault();
        try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (_) {}
        onDownSetter(true);
      }
      function pointerUp(e) {
        e.preventDefault();
        try { e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch (_) {}
        onDownSetter(false);
      }
      btn.addEventListener('pointerdown', pointerDown);
      btn.addEventListener('pointerup', pointerUp);
      btn.addEventListener('pointercancel', pointerUp);
      btn.addEventListener('pointerleave', pointerUp);
      // fallback for older touch
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); onDownSetter(true); }, {passive: false});
      btn.addEventListener('touchend', (e) => { e.preventDefault(); onDownSetter(false); });
    });
  }
};

// Spawn manager: wait for first ball movement, then start interval
PP.SpawnManager = function(state) {
  this.state = state;
  this.intervalId = null;
  this.started = false;
};
PP.SpawnManager.prototype.start = function() {
  if (this.started) return;
  this.started = true;
  if (!this.state.paused) {
    this.intervalId = setInterval(() => {
      this.state.balls.push(new PP.Ball(this.state.ballOpts));
    }, 10000);
  }
};
PP.SpawnManager.prototype.pause = function() {
  if (this.intervalId) {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
};
PP.SpawnManager.prototype.resume = function() {
  if (!this.started) return;
  if (!this.intervalId && !this.state.paused) {
    this.intervalId = setInterval(() => {
      this.state.balls.push(new PP.Ball(this.state.ballOpts));
    }, 10000);
  }
};