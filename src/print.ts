/** Print dialog, handlers, and answer reveal logic for BYR Docs Wiki exam pages. */

const WIKI_SOURCE_URL = "https://wiki.byrdocs.org";
const LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

interface PrePrintState {
  blanks: Element[];
  solutions: Element[];
  choices: Element[];
  withAnswers: boolean;
  wasHidden?: boolean;
}

interface ExamStateController {
  getAllShown?: () => boolean;
  toggleAll?: () => void;
}

function getExamState(): ExamStateController | undefined {
  return (window as Window & { __examState?: ExamStateController }).__examState;
}

function createDialog(): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.id = "bdwpPrintDialog";
  dialog.className = "bdwp-print-dialog";
  dialog.setAttribute("aria-labelledby", "bdwpPrintDialogTitle");
  dialog.innerHTML = `
    <div class="bdwp-print-dialog-panel">
      <h2 id="bdwpPrintDialogTitle" class="bdwp-print-dialog-title">打印选项</h2>
      <p class="bdwp-print-dialog-desc">选择要包含在打印稿中的内容。</p>
      <label class="bdwp-print-dialog-option">
        <input id="bdwpPrintInfo" type="checkbox" checked />
        <span>打印试题概要信息</span>
      </label>
      <label class="bdwp-print-dialog-option bdwp-print-dialog-option-spaced">
        <input id="bdwpPrintAnswers" type="checkbox" checked />
        <span>打印答案</span>
      </label>
      <div class="bdwp-print-dialog-actions">
        <button id="bdwpPrintDialogCancel" class="bdwp-print-dialog-btn bdwp-print-dialog-btn-secondary" type="button">取消</button>
        <button id="bdwpPrintDialogConfirm" class="bdwp-print-dialog-btn bdwp-print-dialog-btn-primary" type="button">打印</button>
      </div>
    </div>
  `;
  return dialog;
}

function createFab(): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = "bdwpPrintFab";
  button.type = "button";
  button.className = "bdwp-print-fab";
  button.setAttribute("aria-label", "打印试卷");
  button.title = "打印试卷";
  button.innerHTML = `
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
  `;
  return button;
}

function revealAllAnswers(prePrintState: PrePrintState): void {
  const examState = getExamState();
  if (!examState?.getAllShown?.()) {
    examState?.toggleAll?.();
    prePrintState.wasHidden = true;
  }

  document.querySelectorAll(".exam-solution:not([open])").forEach((el) => {
    el.setAttribute("open", "");
    prePrintState.solutions.push(el);
  });

  document
    .querySelectorAll(".exam-blank[aria-pressed='false']")
    .forEach((el) => {
      el.setAttribute("aria-pressed", "true");
      prePrintState.blanks.push(el);
    });

  document
    .querySelectorAll(
      ".exam-choices[data-has-answer='true'][data-revealed='false']",
    )
    .forEach((group) => {
      group.querySelectorAll(".exam-choice-option").forEach((opt) => {
        if (opt.getAttribute("data-answer") === "true") {
          opt.classList.add("is-correct");
          const input = opt.querySelector<HTMLInputElement>(
            ".exam-choice-input",
          );
          if (input) input.checked = true;
        }
      });
      group.setAttribute("data-revealed", "true");
      prePrintState.choices.push(group);
    });
}

function restoreAnswers(prePrintState: PrePrintState): void {
  if (prePrintState.wasHidden) {
    getExamState()?.toggleAll?.();
  }
  prePrintState.solutions.forEach((el) => el.removeAttribute("open"));
  prePrintState.blanks.forEach((el) =>
    el.setAttribute("aria-pressed", "false"),
  );
  prePrintState.choices.forEach((group) => {
    group.querySelectorAll(".exam-choice-option").forEach((opt) => {
      opt.classList.remove("is-correct");
      const input = opt.querySelector<HTMLInputElement>(".exam-choice-input");
      if (input) input.checked = false;
    });
    group.setAttribute("data-revealed", "false");
  });
}

export function mountPrintFeature(): void {
  if (document.getElementById("bdwpPrintFab")) return;
  if (!document.querySelector(".exam-page-main")) return;

  const dialog = createDialog();
  const fab = createFab();
  document.body.append(dialog, fab);

  const printAnswersInput = document.getElementById(
    "bdwpPrintAnswers",
  ) as HTMLInputElement | null;
  const printInfoInput = document.getElementById(
    "bdwpPrintInfo",
  ) as HTMLInputElement | null;
  const cancelButton = document.getElementById("bdwpPrintDialogCancel");
  const confirmButton = document.getElementById("bdwpPrintDialogConfirm");

  let printUrlFooter: HTMLElement | null = null;
  let prePrintState: PrePrintState | null = null;
  let printWithAnswers = true;
  let printWithInfo = true;

  const openDialog = () => {
    if (printAnswersInput) printAnswersInput.checked = printWithAnswers;
    if (printInfoInput) printInfoInput.checked = printWithInfo;
    if (!dialog.open) dialog.showModal();
  };

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  const startPrint = (withAnswers: boolean, withInfo: boolean) => {
    printWithAnswers = withAnswers;
    printWithInfo = withInfo;
    document.documentElement.dataset.printAnswers = withAnswers
      ? "true"
      : "false";
    document.documentElement.dataset.printInfo = withInfo ? "true" : "false";
    closeDialog();
    window.print();
  };

  window.addEventListener("beforeprint", () => {
    const withAnswers =
      document.documentElement.dataset.printAnswers !== "false";
    printWithAnswers = withAnswers;

    prePrintState = {
      blanks: [],
      solutions: [],
      choices: [],
      withAnswers,
    };

    if (withAnswers && prePrintState) {
      revealAllAnswers(prePrintState);
    }

    printUrlFooter = document.createElement("div");
    printUrlFooter.className = "print-footer";
    printUrlFooter.style.display = "none";
    printUrlFooter.innerHTML =
      `本页面打印自 <a href="${window.location.href}">${window.location.href}</a><br>` +
      `来源：<a href="${WIKI_SOURCE_URL}">BYR Docs 维基真题</a><br>` +
      `除非另有声明，本文件内容采用 <a href="${LICENSE_URL}">CC BY-NC-SA 4.0</a> 授权。`;
    document.querySelector(".wiki-content")?.appendChild(printUrlFooter);
  });

  window.addEventListener("afterprint", () => {
    printUrlFooter?.remove();
    printUrlFooter = null;

    if (!prePrintState) return;
    if (prePrintState.withAnswers) {
      restoreAnswers(prePrintState);
    }
    prePrintState = null;
  });

  fab.addEventListener("click", openDialog);
  cancelButton?.addEventListener("click", closeDialog);
  confirmButton?.addEventListener("click", () => {
    startPrint(
      printAnswersInput?.checked ?? true,
      printInfoInput?.checked ?? true,
    );
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  window.addEventListener(
    "keydown",
    (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key !== "p" && event.key !== "P") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    },
    true,
  );
}
