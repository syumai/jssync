/**
 * JavaScript code execution module using iframe sandbox
 *
 * On each execution, removes the existing iframe and creates a new one
 * with the sandbox="allow-scripts" attribute via srcdoc. Console methods
 * are overridden inside the iframe to send results to the parent page
 * via postMessage.
 */

/** Message type sent from iframe to parent page */
export type ExecutionMessage =
  | { type: "console"; level: "log" | "error" | "warn" | "info"; args: string[] }
  | { type: "error"; message: string }
  | { type: "complete" };

/** Execution result callback type */
export type OutputCallback = (message: ExecutionMessage) => void;

/** Timeout duration (milliseconds) */
const EXECUTION_TIMEOUT_MS = 5000;

/**
 * Generates HTML to be used as srcdoc.
 * Overrides console methods inside the iframe and sends
 * output to the parent page via postMessage.
 */
function buildSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function() {
  // Override console methods
  var levels = ["log", "error", "warn", "info"];
  for (var i = 0; i < levels.length; i++) {
    (function(level) {
      console[level] = function() {
        var args = [];
        for (var j = 0; j < arguments.length; j++) {
          try {
            args.push(String(arguments[j]));
          } catch (e) {
            args.push("[unstringifiable]");
          }
        }
        window.parent.postMessage({
          type: "console",
          level: level,
          args: args
        }, "*");
      };
    })(levels[i]);
  }

  // Capture runtime errors
  window.onerror = function(message) {
    window.parent.postMessage({
      type: "error",
      message: String(message)
    }, "*");
  };

  try {
    // Execute user code
    (0, eval)(${JSON.stringify(code)});
  } catch (e) {
    window.parent.postMessage({
      type: "error",
      message: String(e)
    }, "*");
  }

  // Notify execution complete
  window.parent.postMessage({ type: "complete" }, "*");
})();
</script>
</body>
</html>`;
}

/**
 * IframeSandboxExecutor class
 *
 * Executes JavaScript code inside an iframe sandbox and receives
 * results via postMessage to notify the caller.
 */
export class IframeSandboxExecutor {
  private iframe: HTMLIFrameElement | null = null;
  private timeoutId: number | null = null;
  private callback: OutputCallback | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** Set the execution result callback */
  onOutput(callback: OutputCallback): void {
    this.callback = callback;
  }

  /** Execute editor code inside an iframe sandbox */
  execute(code: string): void {
    // Destroy existing execution
    this.destroy();

    // Create new iframe
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.display = "none";
    iframe.srcdoc = buildSrcdoc(code);
    this.iframe = iframe;

    // Set up message event listener
    const handler = (event: MessageEvent) => {
      // Verify event.source is the managed iframe
      if (!this.iframe || event.source !== this.iframe.contentWindow) {
        return;
      }

      const data = event.data as ExecutionMessage;
      if (!data || !data.type) {
        return;
      }

      if (this.callback) {
        this.callback(data);
      }

      // Clear timeout on execution complete
      if (data.type === "complete") {
        this.clearTimeout();
      }
    };
    this.messageHandler = handler;
    window.addEventListener("message", handler);

    // Set timeout
    this.timeoutId = window.setTimeout(() => {
      if (this.callback) {
        this.callback({
          type: "error",
          message: "Execution timed out"
        });
        this.callback({
          type: "complete"
        });
      }
      this.destroy();
    }, EXECUTION_TIMEOUT_MS);

    // Append iframe to DOM to start execution
    this.container.appendChild(iframe);
  }

  /** Destroy the current execution iframe */
  destroy(): void {
    this.clearTimeout();

    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }

    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }

  /** Clear the timeout timer */
  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
