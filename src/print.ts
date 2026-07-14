import { ensurePrintButtonPlacement, mountPrintButton } from "./print-button";
import { buildPrintAnswersAppendix } from "./print-appendix";
import { applyPrintTakeover } from "./print-takeover";
import {
  getTakeoverPrint,
  onTakeoverPrintChanged,
  setTakeoverPrint,
} from "./settings";

/** Print dialog, handlers, and answer reveal logic for BYR Docs Wiki exam pages. */

type AnswerPlacement = "inline" | "end";

interface PrePrintState {
  blanks: Element[];
  solutions: Element[];
  choices: Element[];
  withAnswers: boolean;
  placement: AnswerPlacement;
  wasHidden?: boolean;
}

interface RemovedPrintInfoNode {
  el: HTMLElement;
  parent: Node;
  nextSibling: Node | null;
}

let removedPrintInfoNodes: RemovedPrintInfoNode[] = [];

function shouldPrintExamInfo(): boolean {
  return document.documentElement.dataset.bdwpPrintInfo === "true";
}

function isExamInfoAside(el: Element): boolean {
  if (!(el instanceof HTMLElement) || el.tagName !== "ASIDE") return false;
  const heading = el.querySelector(".border-b p, .border-b h2, .border-b h3");
  return (heading?.textContent || "").trim() === "试题信息";
}

function getExamInfoElements(): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const add = (el: Element | null | undefined): void => {
    if (!(el instanceof HTMLElement) || seen.has(el)) return;
    seen.add(el);
    elements.push(el);
  };

  add(document.getElementById("examInfoBox"));
  document.querySelectorAll(".exam-info-box").forEach(add);

  // Production wiki.byrdocs.org (upstream) InfoBox has no id/class hook.
  document.querySelectorAll(".exam-page-main > aside").forEach((el) => {
    if (isExamInfoAside(el)) add(el);
  });

  return elements;
}

function hideExamInfoForPrint(): void {
  removedPrintInfoNodes = [];
  getExamInfoElements().forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    removedPrintInfoNodes.push({
      el,
      parent,
      nextSibling: el.nextSibling,
    });
    el.remove();
  });
}

function restoreExamInfoAfterPrint(): void {
  removedPrintInfoNodes.forEach(({ el, parent, nextSibling }) => {
    if (el.isConnected) return;
    if (nextSibling && nextSibling.parentNode === parent) {
      parent.insertBefore(el, nextSibling);
    } else {
      parent.appendChild(el);
    }
  });
  removedPrintInfoNodes = [];
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
        <input id="bdwpPrintInfo" type="checkbox" />
        <span>打印试题概要信息</span>
      </label>
      <label class="bdwp-print-dialog-option bdwp-print-dialog-option-spaced">
        <input id="bdwpPrintAnswers" type="checkbox" checked />
        <span>打印答案</span>
      </label>
      <fieldset id="bdwpPrintAnswerPlacement" class="bdwp-print-dialog-fieldset">
        <legend class="bdwp-print-dialog-legend">答案位置</legend>
        <label class="bdwp-print-dialog-radio">
          <input type="radio" name="bdwpPrintAnswerPlacement" value="inline" />
          <span>放在原题位置</span>
        </label>
        <label class="bdwp-print-dialog-radio">
          <input type="radio" name="bdwpPrintAnswerPlacement" value="end" checked />
          <span>统一放在最后</span>
        </label>
      </fieldset>
      <label class="bdwp-print-dialog-option bdwp-print-dialog-option-spaced bdwp-print-dialog-takeover">
        <input id="bdwpTakeoverPrint" type="checkbox" checked />
        <span>仅扩展接管打印（拦截 Ctrl/Cmd+P 与主站打印按钮）</span>
      </label>
      <div class="bdwp-print-dialog-actions">
        <button id="bdwpPrintDialogCancel" class="bdwp-print-dialog-btn bdwp-print-dialog-btn-secondary" type="button">取消</button>
        <button id="bdwpPrintDialogConfirm" class="bdwp-print-dialog-btn bdwp-print-dialog-btn-primary" type="button">打印</button>
      </div>
    </div>
  `;
  return dialog;
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

/** Collapse revealed answers on the original paper when answers print in the appendix. */
function collapseInlineAnswersForEndPrint(): void {
  document.querySelectorAll(".exam-solution[open]").forEach((el) => {
    el.removeAttribute("open");
  });

  document
    .querySelectorAll(".exam-blank[aria-pressed='true']")
    .forEach((el) => {
      el.setAttribute("aria-pressed", "false");
    });

  document
    .querySelectorAll(".exam-choices[data-revealed='true']")
    .forEach((group) => {
      group.setAttribute("data-revealed", "false");
      group.querySelectorAll(".exam-choice-option").forEach((opt) => {
        opt.classList.remove("is-correct", "is-wrong", "is-missed");
        const input = opt.querySelector<HTMLInputElement>(".exam-choice-input");
        if (input) input.checked = false;
      });
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
  if (document.getElementById("bdwpPrintDialog")) return;
  if (!document.querySelector(".exam-page-main")) return;

  const dialog = createDialog();
  document.body.append(dialog);

  const printAnswersInput = document.getElementById(
    "bdwpPrintAnswers",
  ) as HTMLInputElement | null;
  const printInfoInput = document.getElementById(
    "bdwpPrintInfo",
  ) as HTMLInputElement | null;
  const printAnswerPlacementFieldset = document.getElementById(
    "bdwpPrintAnswerPlacement",
  );
  const takeoverPrintInput = document.getElementById(
    "bdwpTakeoverPrint",
  ) as HTMLInputElement | null;
  const cancelButton = document.getElementById("bdwpPrintDialogCancel");
  const confirmButton = document.getElementById("bdwpPrintDialogConfirm");

  let printAnswersAppendix: HTMLElement | null = null;
  let prePrintState: PrePrintState | null = null;
  let printWithAnswers = true;
  let printWithInfo = false;
  let printAnswerPlacement: AnswerPlacement = "end";

  const getSelectedAnswerPlacement = (): AnswerPlacement => {
    const selected = printAnswerPlacementFieldset?.querySelector(
      'input[name="bdwpPrintAnswerPlacement"]:checked',
    );
    return selected instanceof HTMLInputElement && selected.value === "inline"
      ? "inline"
      : "end";
  };

  const setAnswerPlacementInputs = (placement: AnswerPlacement): void => {
    printAnswerPlacementFieldset
      ?.querySelectorAll('input[name="bdwpPrintAnswerPlacement"]')
      .forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = input.value === placement;
        }
      });
  };

  const syncPrintAnswerPlacementEnabled = (): void => {
    if (!(printAnswerPlacementFieldset instanceof HTMLFieldSetElement)) return;
    const enabled = printAnswersInput instanceof HTMLInputElement
      ? printAnswersInput.checked
      : true;
    printAnswerPlacementFieldset.disabled = !enabled;
  };

  const openDialog = () => {
    if (printAnswersInput) printAnswersInput.checked = printWithAnswers;
    if (printInfoInput) printInfoInput.checked = printWithInfo;
    setAnswerPlacementInputs(printAnswerPlacement);
    syncPrintAnswerPlacementEnabled();
    void syncTakeoverCheckbox();
    if (!dialog.open) dialog.showModal();
  };

  const syncTakeoverCheckbox = async () => {
    if (!(takeoverPrintInput instanceof HTMLInputElement)) return;
    takeoverPrintInput.checked = await getTakeoverPrint();
  };

  const syncPrintTakeover = async () => {
    applyPrintTakeover(await getTakeoverPrint(), openDialog);
  };

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  const startPrint = (
    withAnswers: boolean,
    placement: AnswerPlacement,
    withInfo: boolean,
  ) => {
    printWithAnswers = withAnswers;
    printWithInfo = withInfo;
    printAnswerPlacement = withAnswers ? placement : "inline";
    document.documentElement.dataset.printAnswers = withAnswers ? "true" : "false";
    document.documentElement.dataset.printInfo = withInfo ? "true" : "false";
    document.documentElement.dataset.bdwpPrintInfo = withInfo ? "true" : "false";
    if (withAnswers) {
      document.documentElement.dataset.printAnswerPlacement = placement;
    } else {
      delete document.documentElement.dataset.printAnswerPlacement;
    }
    closeDialog();
    window.print();
  };

  mountPrintButton(openDialog);
  void syncPrintTakeover();
  onTakeoverPrintChanged(() => {
    void syncPrintTakeover();
    void syncTakeoverCheckbox();
  });

  takeoverPrintInput?.addEventListener("change", () => {
    if (!(takeoverPrintInput instanceof HTMLInputElement)) return;
    void setTakeoverPrint(takeoverPrintInput.checked).then(() => {
      void syncPrintTakeover();
    });
  });

  window.addEventListener("beforeprint", () => {
    const withAnswers =
      document.documentElement.dataset.printAnswers !== "false";
    const placement =
      document.documentElement.dataset.printAnswerPlacement === "end"
        ? "end"
        : "inline";
    printWithAnswers = withAnswers;
    printAnswerPlacement = withAnswers ? placement : "inline";

    prePrintState = {
      blanks: [],
      solutions: [],
      choices: [],
      withAnswers,
      placement,
    };

    if (withAnswers && placement === "end") {
      printAnswersAppendix = buildPrintAnswersAppendix();
      if (printAnswersAppendix) {
        document.querySelector(".wiki-content")?.appendChild(printAnswersAppendix);
      }
      // Run after the main site beforeprint handler, which reveals inline answers.
      collapseInlineAnswersForEndPrint();
    } else if (withAnswers) {
      revealAllAnswers(prePrintState);
    }

    document.querySelectorAll(".print-footer").forEach((el) => {
      el.remove();
    });

    if (!shouldPrintExamInfo()) {
      hideExamInfoForPrint();
    }
  });

  window.addEventListener("afterprint", () => {
    restoreExamInfoAfterPrint();
    printAnswersAppendix?.remove();
    printAnswersAppendix = null;

    delete document.documentElement.dataset.printAnswers;
    delete document.documentElement.dataset.printAnswerPlacement;
    delete document.documentElement.dataset.printInfo;
    delete document.documentElement.dataset.bdwpPrintInfo;

    if (!prePrintState) return;
    if (prePrintState.withAnswers && prePrintState.placement !== "end") {
      restoreAnswers(prePrintState);
    }
    prePrintState = null;
  });

  printAnswersInput?.addEventListener("change", syncPrintAnswerPlacementEnabled);
  cancelButton?.addEventListener("click", closeDialog);
  confirmButton?.addEventListener("click", () => {
    startPrint(
      printAnswersInput?.checked ?? true,
      getSelectedAnswerPlacement(),
      printInfoInput?.checked ?? false,
    );
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
}

export { ensurePrintButtonPlacement };
