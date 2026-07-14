const STORAGE_KEY = "bdwp-print-button-position";
const DRAG_THRESHOLD_PX = 5;
const TOOLBAR_SNAP_PADDING_PX = 48;

export interface ButtonPosition {
  mode: "docked" | "free";
  x?: number;
  y?: number;
}

const PRINT_ICON = `
  <svg aria-hidden="true" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
`;

function readPosition(): ButtonPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "docked" };
    const parsed = JSON.parse(raw) as ButtonPosition;
    if (parsed.mode === "free" && typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
    return { mode: "docked" };
  } catch {
    return { mode: "docked" };
  }
}

function savePosition(position: ButtonPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // ignore quota errors
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getToolbarActions(): HTMLElement | null {
  return document.getElementById("examToolbarActions");
}

function getToolbar(): HTMLElement | null {
  return document.getElementById("examToolbar");
}

function clampFreePosition(x: number, y: number, button: HTMLElement): ButtonPosition {
  const maxX = Math.max(0, window.innerWidth - button.offsetWidth);
  const maxY = Math.max(0, window.innerHeight - button.offsetHeight);
  return {
    mode: "free",
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
  };
}

function applyFreePosition(button: HTMLElement, x: number, y: number): void {
  const clamped = clampFreePosition(x, y, button);
  button.classList.add("is-free");
  button.style.left = `${clamped.x}px`;
  button.style.top = `${clamped.y}px`;
  button.style.right = "auto";
  button.style.bottom = "auto";
}

function isButtonDocked(button: HTMLElement): boolean {
  const actions = getToolbarActions();
  return (
    actions !== null &&
    button.parentElement === actions &&
    actions.firstElementChild === button &&
    !button.classList.contains("is-free")
  );
}

function dockButton(button: HTMLElement): boolean {
  const actions = getToolbarActions();
  if (!actions) return false;

  button.hidden = false;
  if (isButtonDocked(button)) {
    return true;
  }

  button.classList.remove("is-free", "is-dragging");
  button.style.left = "";
  button.style.top = "";
  button.style.right = "";
  button.style.bottom = "";
  actions.insertBefore(button, actions.firstChild);
  return true;
}

function isNearToolbar(button: HTMLElement): boolean {
  const toolbar = getToolbar();
  if (!toolbar) return false;

  const toolbarRect = toolbar.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const centerX = buttonRect.left + buttonRect.width / 2;
  const centerY = buttonRect.top + buttonRect.height / 2;

  return (
    centerX >= toolbarRect.left - TOOLBAR_SNAP_PADDING_PX &&
    centerX <= toolbarRect.right + TOOLBAR_SNAP_PADDING_PX &&
    centerY >= toolbarRect.top - TOOLBAR_SNAP_PADDING_PX &&
    centerY <= toolbarRect.bottom + TOOLBAR_SNAP_PADDING_PX
  );
}

function createPrintButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = "bdwpPrintControl";
  button.type = "button";
  button.className =
    "floating-toolbar-control cursor-pointer active:scale-95 bdwp-print-control";
  button.setAttribute("aria-label", "打印试卷");
  button.setAttribute("data-tooltip", "打印试卷（扩展，可拖拽）");
  button.title = "打印试卷（扩展，可拖拽）";
  button.innerHTML = PRINT_ICON;
  return button;
}

function setupDraggable(button: HTMLButtonElement, onClick: () => void): void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let moved = false;
  let dragging = false;

  const finishDrag = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;

    button.releasePointerCapture(event.pointerId);
    pointerId = null;
    button.classList.remove("is-dragging");

    if (dragging) {
      if (isNearToolbar(button)) {
        savePosition({ mode: "docked" });
        dockButton(button);
      } else {
        const rect = button.getBoundingClientRect();
        const position = clampFreePosition(rect.left, rect.top, button);
        savePosition(position);
        applyFreePosition(button, position.x!, position.y!);
      }
    } else {
      onClick();
    }

    dragging = false;
    moved = false;
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
    dragging = false;

    const rect = button.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    if (!moved) {
      moved = true;
      dragging = true;
      button.classList.add("is-dragging");

      if (!button.classList.contains("is-free")) {
        document.body.appendChild(button);
        applyFreePosition(
          button,
          event.clientX - offsetX,
          event.clientY - offsetY,
        );
      }
    }

    applyFreePosition(
      button,
      event.clientX - offsetX,
      event.clientY - offsetY,
    );
  });

  button.addEventListener("pointerup", finishDrag);
  button.addEventListener("pointercancel", finishDrag);
}

export function mountPrintButton(onClick: () => void): HTMLButtonElement | null {
  const existing = document.getElementById("bdwpPrintControl");
  if (existing instanceof HTMLButtonElement) {
    return existing;
  }

  const button = createPrintButton();
  setupDraggable(button, onClick);

  const position = readPosition();
  if (position.mode === "docked") {
    if (dockButton(button)) {
      return button;
    }
    button.hidden = true;
    document.body.appendChild(button);
    return button;
  }

  document.body.appendChild(button);
  applyFreePosition(button, position.x ?? 16, position.y ?? 16);
  return button;
}

export function needsPlacementSync(): boolean {
  if (readPosition().mode !== "docked") return false;
  const button = document.getElementById("bdwpPrintControl");
  if (!(button instanceof HTMLButtonElement)) return false;
  if (!getToolbarActions()) return false;
  return !isButtonDocked(button);
}

export function isPrintUiReady(): boolean {
  if (!document.getElementById("bdwpPrintDialog")) return false;
  const button = document.getElementById("bdwpPrintControl");
  if (!(button instanceof HTMLButtonElement)) return false;
  if (readPosition().mode === "free") return true;
  if (!getToolbarActions()) return false;
  return isButtonDocked(button);
}

export function ensurePrintButtonPlacement(): void {
  const button = document.getElementById("bdwpPrintControl");
  if (!(button instanceof HTMLButtonElement)) return;

  const position = readPosition();
  if (position.mode !== "docked") return;
  if (!getToolbarActions()) return;
  if (isButtonDocked(button)) return;

  dockButton(button);
}
