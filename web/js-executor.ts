/**
 * iframe sandbox による JavaScript コード実行モジュール
 *
 * 各実行時に既存の iframe を除去し、sandbox="allow-scripts" 属性付きの
 * 新規 iframe を srcdoc で生成する。iframe 内で console メソッドを
 * オーバーライドし postMessage で親ページに結果を送信する。
 */

/** iframe から親ページへ送信されるメッセージの型 */
export type ExecutionMessage =
  | { type: "console"; level: "log" | "error" | "warn" | "info"; args: string[] }
  | { type: "error"; message: string }
  | { type: "complete" };

/** 実行結果コールバック型 */
export type OutputCallback = (message: ExecutionMessage) => void;

/** タイムアウト時間 (ミリ秒) */
const EXECUTION_TIMEOUT_MS = 5000;

/**
 * srcdoc として使用する HTML を生成する。
 * iframe 内で console メソッドをオーバーライドし、
 * postMessage で親ページに出力を送信する。
 */
function buildSrcdoc(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function() {
  // console メソッドのオーバーライド
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

  // ランタイムエラーのキャプチャ
  window.onerror = function(message) {
    window.parent.postMessage({
      type: "error",
      message: String(message)
    }, "*");
  };

  try {
    // ユーザーコードを実行
    (0, eval)(${JSON.stringify(code)});
  } catch (e) {
    window.parent.postMessage({
      type: "error",
      message: String(e)
    }, "*");
  }

  // 実行完了を通知
  window.parent.postMessage({ type: "complete" }, "*");
})();
</script>
</body>
</html>`;
}

/**
 * IframeSandboxExecutor クラス
 *
 * iframe sandbox 内で JavaScript コードを実行し、
 * postMessage 経由で結果を受信して呼び出し元に通知する。
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

  /** 実行結果コールバックを設定する */
  onOutput(callback: OutputCallback): void {
    this.callback = callback;
  }

  /** エディタのコードを iframe sandbox 内で実行する */
  execute(code: string): void {
    // 既存の実行を破棄
    this.destroy();

    // 新規 iframe を生成
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.display = "none";
    iframe.srcdoc = buildSrcdoc(code);
    this.iframe = iframe;

    // message イベントリスナーを設定
    const handler = (event: MessageEvent) => {
      // event.source が管理対象 iframe であることを確認
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

      // 実行完了時にタイムアウトをクリア
      if (data.type === "complete") {
        this.clearTimeout();
      }
    };
    this.messageHandler = handler;
    window.addEventListener("message", handler);

    // タイムアウトを設定
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

    // iframe を DOM に追加して実行開始
    this.container.appendChild(iframe);
  }

  /** 現在の実行 iframe を破棄する */
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

  /** タイムアウトタイマーをクリアする */
  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
