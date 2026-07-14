const TAKEOVER_PRINT_KEY = "takeoverPrint";
const DEFAULT_TAKEOVER_PRINT = true;

const checkbox = document.getElementById("takeoverPrint");
const status = document.getElementById("status");

if (!(checkbox instanceof HTMLInputElement)) {
  throw new Error("Missing takeoverPrint checkbox");
}

async function loadSetting() {
  const result = await chrome.storage.local.get(TAKEOVER_PRINT_KEY);
  const value = result[TAKEOVER_PRINT_KEY];
  checkbox.checked =
    typeof value === "boolean" ? value : DEFAULT_TAKEOVER_PRINT;
}

checkbox.addEventListener("change", async () => {
  await chrome.storage.local.set({ [TAKEOVER_PRINT_KEY]: checkbox.checked });
  if (status) {
    status.textContent = "已保存";
    window.setTimeout(() => {
      status.textContent = "";
    }, 1200);
  }
});

loadSetting();
