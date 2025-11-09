// Shared helpers for Ping Pong games (updated: PauseManager + UI helpers)
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
  const containerWidth = canvas.parentElement.clientWidth;
  canvas.style.width = Math.min(containerWidth, 900) + 'px';
};

// Input helpers: keyboard flags and pointer button wiring
PP.Input = {
  keys: {},
  // initialize keyboard handling, returns keys object
  initKeyboard: function() {
    const keys = this.keys;
    window.addEventListener('keydown', (e) => {
      const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : (String(e.key || '').toLowerCase());
      keys[k] = true;
      if (['arrowup','arrowdown',' '].includes(k)) e.preventDefault();
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

// Pause manager: centralizes pause state changes and coordinates with SpawnManager
PP.PauseManager = function(state, spawner) {
  this.state = state || { balls: [], paused: false };
  this.spawner = spawner || null;
};
PP.PauseManager.prototype.isPaused = function() {
  return !!this.state.paused;
};
PP.PauseManager.prototype.pause = function() {
  this.state.paused = true;
  if (this.spawner && typeof this.spawner.pause === 'function') this.spawner.pause();
};
PP.PauseManager.prototype.resume = function() {
  this.state.paused = false;
  if (this.spawner && typeof this.spawner.resume === 'function') this.spawner.resume();
};
PP.PauseManager.prototype.toggle = function() {
  if (this.isPaused()) this.resume(); else this.pause();
};

// UI helpers (pause button wiring, overlay sync)
PP.UI = {
  _spaceHandlerRegistered: false,

  // Setup a pause/resume button by id. pauseManager: instance of PP.PauseManager
  setupPauseButton: function(buttonId, pauseManager, opts = {}) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const pausedOverlay = document.getElementById(opts.pausedOverlayId || 'pausedText');

    function updateButtonLabel() {
      btn.textContent = pauseManager.isPaused() ? (opts.resumeLabel || 'Resume') : (opts.pauseLabel || 'Pause');
      if (pausedOverlay) pausedOverlay.style.display = pauseManager.isPaused() ? '' : 'none';
    }

    // pointer handler (pointerdown toggles)
    function onPointer(e) {
      e.preventDefault();
      pauseManager.toggle();
      updateButtonLabel();
    }
    btn.addEventListener('pointerdown', onPointer);
    // fallback click
    btn.addEventListener('click', (e) => { e.preventDefault(); });

    // Register a global Space handler once (if desired)
    if (!PP.UI._spaceHandlerRegistered) {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          // Try to find a registered pause manager via opts.defaultPauseManager if provided,
          // otherwise do nothing (pages should call setupPauseButton so button exists)
          // We'll toggle all known pause managers only if they are passed in via global registry.
          // For simplicity, if the page stored pauseManager in btn.__pauseManager, toggle that.
          if (btn && btn.__pauseManager) {
            btn.__pauseManager.toggle();
            updateButtonLabel();
          }
        }
      });
      PP.UI._spaceHandlerRegistered = true;
    }

    // Attach manager to button for space handler to find
    btn.__pauseManager = pauseManager;

    // initial label
    updateButtonLabel();

    // expose update function
    return { updateButtonLabel };
  }
};