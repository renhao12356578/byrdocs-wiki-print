import { mountPrintFeature } from "./print";

function isExamPage(): boolean {
  return document.querySelector(".exam-page-main") !== null;
}

function init(): void {
  if (!isExamPage()) return;
  mountPrintFeature();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

// Astro view transitions / client navigation
const observer = new MutationObserver(() => {
  if (isExamPage() && !document.getElementById("bdwpPrintFab")) {
    mountPrintFeature();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
