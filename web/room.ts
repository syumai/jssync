/* JavaScript Playground - collaborative code editor */

// Import dependencies from npm packages
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CodemirrorBinding } from 'y-codemirror';
import { IframeSandboxExecutor, ExecutionMessage } from './js-executor';

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

// iframe sandbox executor
const executor = new IframeSandboxExecutor(document.body);

// Utility functions
const createLine = (kind: string, message: string): HTMLDivElement => {
  const line = document.createElement("div");
  line.classList.add("line");
  line.classList.add(kind);
  line.textContent = message;
  return line;
};

// JavaScript execution via iframe sandbox
function executeRunWithCode(code: string): void {
  jsResult.textContent = "";

  executor.onOutput((msg: ExecutionMessage) => {
    if (msg.type === "console") {
      const kind = msg.level === "error" ? "stderr" : "stdout";
      const text = (msg.args ?? []).join(" ");
      const line = createLine(kind, text);
      jsResult.appendChild(line);
    } else if (msg.type === "error") {
      const line = createLine("stderr", msg.message ?? "Unknown error");
      jsResult.appendChild(line);
    } else if (msg.type === "complete") {
      jsResult.appendChild(
        createLine("system", "\nProgram exited.")
      );
    }
  });

  executor.execute(code);
}

// Event listeners
jsRunBtn.addEventListener("click", () => showConfirmModal());

// Confirmation modal for Shift+Enter execution
const jsConfirmModal = document.getElementById("jsConfirmModal") as HTMLDivElement;
const jsConfirmRun = document.getElementById("jsConfirmRun") as HTMLButtonElement;
const jsConfirmCancel = document.getElementById("jsConfirmCancel") as HTMLButtonElement;
const jsConfirmCode = document.getElementById("jsConfirmCode") as HTMLElement;
const modalBackdrop = jsConfirmModal.querySelector(".modal-backdrop") as HTMLDivElement;

function showConfirmModal(): void {
  // Take a snapshot of the current code
  editor.save();
  const codeSnapshot = jsBody.value;

  // Display the snapshot in the modal
  jsConfirmCode.textContent = codeSnapshot;
  jsConfirmModal.classList.remove("hidden");
  jsConfirmRun.focus();

  const onConfirm = () => {
    hideConfirmModal();
    executeRunWithCode(codeSnapshot);
    editor.focus();
  };

  const onCancel = () => {
    hideConfirmModal();
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  function hideConfirmModal(): void {
    jsConfirmModal.classList.add("hidden");
    jsConfirmRun.removeEventListener("click", onConfirm);
    jsConfirmCancel.removeEventListener("click", onCancel);
    modalBackdrop.removeEventListener("click", onCancel);
    window.removeEventListener("keydown", onKeydown);
  }

  jsConfirmRun.addEventListener("click", onConfirm);
  jsConfirmCancel.addEventListener("click", onCancel);
  modalBackdrop.addEventListener("click", onCancel);
  window.addEventListener("keydown", onKeydown);
}

window.addEventListener("keypress", (e: KeyboardEvent) => {
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    showConfirmModal();
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
  });

  applyOptions();
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
