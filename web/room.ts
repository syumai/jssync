/* JavaScript Playground - collaborative code editor */

// Import dependencies from npm packages
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CodemirrorBinding } from 'y-codemirror';
import { RunResponse } from './run-types';

// Type declarations for global objects and interfaces
interface JsPlaygroundOptions {
  vimMode: boolean;
  tabSize: number;
}

interface CodeMirrorEditor {
  fromTextArea(textarea: HTMLTextAreaElement, config: any): any;
  setOption(option: string, value: any): void;
  setValue(value: string): void;
  save(): void;
}

declare global {
  interface Window {
    CodeMirror: CodeMirrorEditor;
    editor: any;
    roomId: string;
    jsOptionsForm: HTMLFormElement;
  }
}

// CodeMirror editor setup
const jsBody = document.getElementById("jsBody") as HTMLTextAreaElement;
const editor = window.CodeMirror.fromTextArea(jsBody, {
  lineNumbers: true,
  mode: "javascript",
  tabSize: 2,
  indentUnit: 2,
  indentWithTabs: false,
  matchBrackets: true,
});
window.editor = editor;

// Options management
const optionsStr: string | null = window.localStorage.getItem("jsplayground-options");
const optionKeys: (keyof JsPlaygroundOptions)[] = ["vimMode", "tabSize"];
const defaultOptions: JsPlaygroundOptions = {
  vimMode: false,
  tabSize: 2,
};
const parsedOptions: Partial<JsPlaygroundOptions> = optionsStr ? JSON.parse(optionsStr) : {};
const options: JsPlaygroundOptions =
  optionKeys.length === Object.keys(parsedOptions).length
    ? parsedOptions as JsPlaygroundOptions
    : defaultOptions;

// Username management
const USERNAME_STORAGE_KEY = "jsplayground-username";

function generateDefaultUsername(): string {
  return "User " + Math.floor(Math.random() * 100);
}

function getUsername(): string {
  try {
    const saved = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    if (saved !== null && saved.trim() !== "") {
      return saved;
    }
  } catch (e) {
    console.warn("Failed to read username from localStorage:", e);
  }
  return generateDefaultUsername();
}

function saveUsername(username: string): void {
  try {
    window.localStorage.setItem(USERNAME_STORAGE_KEY, username);
  } catch (e) {
    console.warn("Failed to save username to localStorage:", e);
  }
}

// Awareness integration
const userColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
let currentAwareness: any = null;

function setAwarenessUser(awareness: any, username: string): void {
  awareness.setLocalStateField('user', {
    name: username,
    color: userColor,
  });
}

function updateAwarenessUsername(username: string): void {
  if (currentAwareness) {
    setAwarenessUser(currentAwareness, username);
  }
}

// DOM elements
const jsResult = document.getElementById("jsResult") as HTMLDivElement;
const jsOptions = document.getElementById("jsOptions") as HTMLDivElement;
const jsRunBtn = document.getElementById("jsRunBtn") as HTMLButtonElement;
const jsCopyRunBtn = document.getElementById("jsCopyRunBtn") as HTMLButtonElement;
const jsCopyRunDefault = jsCopyRunBtn.querySelector(".copy-run-default") as HTMLSpanElement;
const jsCopyRunFeedback = jsCopyRunBtn.querySelector(".copy-run-feedback") as HTMLSpanElement;

let latestOutputLines: string[] = [];
let lastExecutedCode: string | null = null;
let copyRunFeedbackTimeoutId: number | null = null;
const COPY_RUN_FEEDBACK_MS = 1600;

// Guards against overlapping /api/run requests.
let isRunning = false;

// Utility functions
const createLine = (kind: string, message: string): HTMLDivElement => {
  const line = document.createElement("div");
  line.classList.add("line");
  line.classList.add(kind);
  line.textContent = message;
  return line;
};

// Restore the default button label and cancel pending feedback resets.
function restoreCopyRunButtonLabel(): void {
  if (copyRunFeedbackTimeoutId !== null) {
    window.clearTimeout(copyRunFeedbackTimeoutId);
    copyRunFeedbackTimeoutId = null;
  }
  jsCopyRunDefault.classList.remove("hidden");
  jsCopyRunFeedback.classList.add("hidden");
  jsCopyRunFeedback.textContent = "";
}

// Show temporary copy feedback on the button itself.
function showCopyRunButtonFeedback(label: string): void {
  restoreCopyRunButtonLabel();
  jsCopyRunDefault.classList.add("hidden");
  jsCopyRunFeedback.textContent = label;
  jsCopyRunFeedback.classList.remove("hidden");
  copyRunFeedbackTimeoutId = window.setTimeout(() => {
    restoreCopyRunButtonLabel();
  }, COPY_RUN_FEEDBACK_MS);
}

// Build the copy payload from the last run, or from the current editor state before the first run.
function buildCopyRunText(): string {
  let code = lastExecutedCode;
  if (code === null) {
    editor.save();
    code = jsBody.value;
  }

  return [
    "// ===== Code =====",
    code,
    "",
    "// ===== Output =====",
    latestOutputLines.join("\n"),
  ].join("\n");
}

// Copy the current run snapshot and surface the result through the button label.
async function handleCopyRun(): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildCopyRunText());
    showCopyRunButtonFeedback("Copied");
  } catch (error) {
    console.error("Failed to copy run:", error);
    showCopyRunButtonFeedback("Copy failed");
  }
}

// JavaScript execution via the server-side sandbox (POST /api/run)
async function runCode(): Promise<void> {
  if (isRunning) {
    return;
  }
  isRunning = true;
  jsRunBtn.disabled = true;

  try {
    // Take a snapshot of the current code
    editor.save();
    const code = jsBody.value;

    jsResult.textContent = "";
    latestOutputLines = [];
    lastExecutedCode = code;
    restoreCopyRunButtonLabel();

    const runningLine = createLine("system", "Running...");
    jsResult.appendChild(runningLine);

    const appendLine = (kind: string, text: string): void => {
      jsResult.appendChild(createLine(kind, text));
      if (kind !== "system") {
        latestOutputLines.push(text);
      }
    };

    let response: Response;
    try {
      response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch (error) {
      runningLine.remove();
      const message = error instanceof Error ? error.message : String(error);
      appendLine("stderr", `Failed to reach the server: ${message}`);
      appendLine("system", "\nProgram exited.");
      return;
    }

    runningLine.remove();

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.ok) {
      const result = data as RunResponse;
      for (const text of result.stdout ?? []) {
        appendLine("stdout", text);
      }
      for (const text of result.stderr ?? []) {
        appendLine("stderr", text);
      }
      for (const text of result.results ?? []) {
        appendLine("stdout", text);
      }
      if (result.error) {
        appendLine("stderr", `${result.error.name}: ${result.error.message}`);
        for (const line of result.error.traceback ?? []) {
          appendLine("stderr", line);
        }
      }
      appendLine("system", "\nProgram exited.");
    } else {
      const errorMessage = (data as { error?: unknown } | null)?.error;
      const message =
        typeof errorMessage === "string"
          ? errorMessage
          : `Request failed (HTTP ${response.status})`;
      appendLine("stderr", message);
      appendLine("system", "\nProgram exited.");
    }
  } finally {
    jsRunBtn.disabled = false;
    isRunning = false;
  }
}

// Event listeners
jsRunBtn.addEventListener("click", () => {
  void runCode();
});
jsCopyRunBtn.addEventListener("click", () => {
  void handleCopyRun();
});

window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.defaultPrevented || e.isComposing || e.repeat) {
    return;
  }

  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    void runCode();
    return;
  }

  if (
    e.code === "KeyC" &&
    e.ctrlKey &&
    e.shiftKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    e.preventDefault();
    void handleCopyRun();
    return;
  }
});

// Options functions
function applyOptions(): void {
  editor.setOption("keyMap", options.vimMode ? "vim" : "default");
  editor.setOption("tabSize", options.tabSize);
  editor.setOption("indentUnit", options.tabSize);
}

function initOptionsForm(): void {
  const jsOptionsForm = document.getElementById("jsOptionsForm") as HTMLFormElement;
  window.jsOptionsForm = jsOptionsForm;

  for (const key of optionKeys) {
    const input = (jsOptionsForm as any)[key] as HTMLInputElement;
    const value = options[key];
    if (input.type === "checkbox") {
      input.checked = value as boolean;
      continue;
    }
    input.value = value.toString();
  }

  // Initialize username field from localStorage
  const usernameInput = (jsOptionsForm as any).username as HTMLInputElement;
  usernameInput.value = getUsername();

  jsOptionsForm.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    for (const key of optionKeys) {
      const input = (jsOptionsForm as any)[key] as HTMLInputElement;
      if (input.type === "checkbox") {
        (options as any)[key] = input.checked;
        continue;
      }
      if (input.type === "number") {
        (options as any)[key] = parseInt(input.value);
        continue;
      }
      (options as any)[key] = input.value;
    }
    applyOptions();
    window.localStorage.setItem(
      "jsplayground-options",
      JSON.stringify(options)
    );

    // Save username and update awareness
    const username = usernameInput.value.trim() || generateDefaultUsername();
    usernameInput.value = username;
    saveUsername(username);
    updateAwarenessUsername(username);
  });

  applyOptions();
}

// Resizer for adjusting the height of the editor / result panel split
const RESULT_HEIGHT_STORAGE_KEY = "jsplayground-result-height";

function initResizer(): void {
  const main = document.querySelector("main.app") as HTMLElement | null;
  const resizer = document.getElementById("jsResizer") as HTMLElement | null;
  if (!main || !resizer) return;

  // Restore a previously saved result panel height, if any.
  const savedHeight: string | null = window.localStorage.getItem(RESULT_HEIGHT_STORAGE_KEY);
  if (savedHeight !== null) {
    const parsed: number = parseFloat(savedHeight);
    if (!isNaN(parsed)) {
      main.style.setProperty("--result-height", `${parsed}px`);
    }
  }

  const minResult = 50;
  const editorMinHeight = 100;

  function getMaxResult(): number {
    return main!.clientHeight - resizer!.offsetHeight - editorMinHeight;
  }

  function getCurrentResultHeight(): number {
    const value = getComputedStyle(main!).getPropertyValue("--result-height");
    return parseFloat(value);
  }

  function setResultHeight(height: number): void {
    main!.style.setProperty("--result-height", `${height}px`);
  }

  let dragging = false;
  let startY = 0;
  let startHeight = 0;

  resizer.addEventListener("pointerdown", (e: PointerEvent) => {
    dragging = true;
    resizer.setPointerCapture(e.pointerId);
    startY = e.clientY;
    startHeight = getCurrentResultHeight();
    resizer.classList.add("dragging");
  });

  resizer.addEventListener("pointermove", (e: PointerEvent) => {
    if (!dragging) return;
    const newHeight: number = startHeight + (startY - e.clientY);
    const maxResult: number = getMaxResult();
    const clamped: number = Math.min(Math.max(newHeight, minResult), maxResult);
    setResultHeight(clamped);
    window.editor.refresh();
  });

  function endDrag(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    resizer!.classList.remove("dragging");
    resizer!.releasePointerCapture(e.pointerId);
    window.localStorage.setItem(
      RESULT_HEIGHT_STORAGE_KEY,
      getCurrentResultHeight().toString()
    );
    window.editor.refresh();
  }

  resizer.addEventListener("pointerup", endDrag);
  resizer.addEventListener("pointercancel", endDrag);

  window.addEventListener("resize", () => {
    const maxResult: number = getMaxResult();
    const current: number = getCurrentResultHeight();
    if (current > maxResult) {
      setResultHeight(Math.max(maxResult, minResult));
    }
  });
}

const jsOptionsBtn = document.getElementById("jsOptionsBtn") as HTMLButtonElement;
jsOptionsBtn.addEventListener("click", () => {
  const closedLabel = "Options";
  const openedLabel = "Hide Options";
  if (jsOptionsBtn.textContent === closedLabel) {
    jsOptionsBtn.textContent = openedLabel;
    jsOptions.classList.remove("hidden");
    jsResult.classList.add("hidden");
    return;
  }
  jsOptionsBtn.textContent = closedLabel;
  jsResult.classList.remove("hidden");
  jsOptions.classList.add("hidden");
});

// Yjs collaborative editing setup
function initCollaborativeEditing(): void {
  // Get room information from global variables set in template
  const roomId: string = window.roomId;

  if (!roomId) {
    console.log('No roomId found, skipping collaborative editing setup');
    return;
  }

  // yjs collaborative editing setup
  const ydoc: Y.Doc = new Y.Doc();
  // y-websocket creates URL as: baseUrl + '/' + roomname
  // So for /yjs/roomId, we need baseUrl='/yjs' and roomname=roomId
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl: string = `${protocol}//${window.location.host}/yjs`;

  // This will create WebSocket connection to: /yjs/roomId (correct format)
  const provider: WebsocketProvider = new WebsocketProvider(wsUrl, roomId, ydoc);
  const ytext: Y.Text = ydoc.getText('codemirror');
  const binding: CodemirrorBinding = new CodemirrorBinding(ytext, editor, provider.awareness);

  // Set up awareness (cursor sharing)
  currentAwareness = provider.awareness;
  setAwarenessUser(provider.awareness, getUsername());

  console.log('yjs collaborative editing initialized');
}

// Initialize everything when DOM is loaded
function init(): void {
  initOptionsForm();
  initResizer();
  restoreCopyRunButtonLabel();

  // Wait for CodeMirror to be fully initialized
  setTimeout(() => {
    initCollaborativeEditing();
  }, 100);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
