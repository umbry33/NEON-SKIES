export class InputSystem {
  constructor(canvas, logicalSize) {
    this.canvas = canvas;
    this.logicalSize = logicalSize;
    this.keys = new Set();
    this.pointers = new Map();
    this.controlPointerId = null;
    this.pointer = { active: false, x: logicalSize.width / 2, y: logicalSize.height - 100 };
    this.skillHandler = null;
    this.boundKeyDown = (event) => this.onKeyDown(event);
    this.boundKeyUp = (event) => this.onKeyUp(event);
    this.boundPointerDown = (event) => this.onPointerDown(event);
    this.boundPointerMove = (event) => this.onPointerMove(event);
    this.boundPointerEnd = (event) => this.onPointerEnd(event);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    canvas.addEventListener("pointerdown", this.boundPointerDown);
    canvas.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerEnd);
    window.addEventListener("pointercancel", this.boundPointerEnd);
  }

  setSkillHandler(handler) { this.skillHandler = handler; }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      event.preventDefault();
      this.keys.add(key);
      return;
    }
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      this.skillHandler?.(Number(event.key) - 1);
    }
  }

  onKeyUp(event) { this.keys.delete(event.key.toLowerCase()); }

  toLogicalPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * this.logicalSize.width, y: ((event.clientY - rect.top) / rect.height) * this.logicalSize.height };
  }

  onPointerDown(event) {
    this.pointers.set(event.pointerId, this.toLogicalPosition(event));
    // The skill controls are DOM buttons above the canvas, so their pointer events never enter here.
    if (this.controlPointerId === null) {
      this.controlPointerId = event.pointerId;
      this.pointer = { ...this.pointer, ...this.toLogicalPosition(event), active: true };
      this.canvas.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, this.toLogicalPosition(event));
    if (event.pointerId === this.controlPointerId) this.pointer = { ...this.pointer, ...this.toLogicalPosition(event), active: true };
    event.preventDefault();
  }

  onPointerEnd(event) {
    this.pointers.delete(event.pointerId);
    if (event.pointerId !== this.controlPointerId) return;
    const next = this.pointers.entries().next();
    if (!next.done) {
      this.controlPointerId = next.value[0];
      this.pointer = { ...this.pointer, ...next.value[1], active: true };
    } else {
      this.controlPointerId = null;
      this.pointer.active = false;
    }
  }

  getMovementVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) y -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) y += 1;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, active: Boolean(x || y) };
  }
}
