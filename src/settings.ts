export const TAKEOVER_PRINT_KEY = "takeoverPrint";
export const DEFAULT_TAKEOVER_PRINT = true;

export async function getTakeoverPrint(): Promise<boolean> {
  try {
    if (typeof chrome?.storage?.local?.get === "function") {
      const result = await chrome.storage.local.get(TAKEOVER_PRINT_KEY);
      const value = result[TAKEOVER_PRINT_KEY];
      return typeof value === "boolean" ? value : DEFAULT_TAKEOVER_PRINT;
    }
  } catch {
    // fall through
  }

  try {
    const raw = localStorage.getItem(TAKEOVER_PRINT_KEY);
    if (raw === null) return DEFAULT_TAKEOVER_PRINT;
    return raw === "true";
  } catch {
    return DEFAULT_TAKEOVER_PRINT;
  }
}

export async function setTakeoverPrint(enabled: boolean): Promise<void> {
  try {
    if (typeof chrome?.storage?.local?.set === "function") {
      await chrome.storage.local.set({ [TAKEOVER_PRINT_KEY]: enabled });
      return;
    }
  } catch {
    // fall through
  }

  try {
    localStorage.setItem(TAKEOVER_PRINT_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function onTakeoverPrintChanged(
  callback: (enabled: boolean) => void,
): void {
  if (typeof chrome?.storage?.onChanged?.addListener !== "function") return;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const change = changes[TAKEOVER_PRINT_KEY];
    if (!change) return;
    callback(
      typeof change.newValue === "boolean"
        ? change.newValue
        : DEFAULT_TAKEOVER_PRINT,
    );
  });
}
