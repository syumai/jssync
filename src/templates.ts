export interface RoomTemplateData {
  roomId: string;
}

export const homeTemplate = (): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <title>JavaScript Playground - with coedit mode -</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/normalize-css@2.3.1/normalize.css" integrity="sha256-oQhE1gzQ/RLRlHgKfVUhrAe03FJbQLmTjY5ngEJPhdg=" crossorigin="anonymous">
  <link rel="stylesheet" href="/home.css">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>

<body>
  <div class="dialog">
    <div class="header">
      <div class="title">
        JavaScript Playground
      </div>
      <div class="subtitle">
        - with coedit mode -
      </div>
    </div>
    <div class="body">
      <div class="forms">
        <form action="#" id="joinForm">
          <div class="inputs">
            <label>
              Room ID: <input type="text" name="roomId" id="roomId" maxlength="20">
            </label>
          </div>
          <button>Join</button>
        </form>
      </div>
    </div>
  </div>
  <script type="module" src="/home.js"></script>
</body>
</html>`;
};

export const roomTemplate = (data: RoomTemplateData): string => {
  const { roomId } = data;
  
  return `<!DOCTYPE html>
<!-- Original contents is available on https://github.com/syumai/jssync -->
<html>
<head>
  <title>JavaScript Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.58.3/lib/codemirror.css" integrity="sha256-0wqkEinay6WmMf1F6gVEv9sHx4mSggtnkAsQm1cJX7I=" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/normalize-css@2.3.1/normalize.css" integrity="sha256-oQhE1gzQ/RLRlHgKfVUhrAe03FJbQLmTjY5ngEJPhdg=" crossorigin="anonymous">
  <link rel="stylesheet" href="/room.css">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>

<body>
  <header>
    <div class="title">JavaScript Playground</div>
    <div class="header-content">
      <div class="button-container">
        <button id="jsRunBtn" class="primary">Run <kbd>(Shift+Enter)</kbd></button>
        <button id="jsCopyRunBtn">
          <span class="copy-run-default">Copy Run <kbd>(Ctrl + C)</kbd></span>
          <span class="copy-run-feedback hidden"></span>
        </button>
        <button id="jsOptionsBtn">Options</button>
      </div>
      <div class="link-to-github">
        <a href="https://github.com/syumai/jssync" target="_blank">GitHub</a>
      </div>
    </div>
  </header>
  <main class="app">
    <textarea id="jsBody" class="code-body"></textarea>
    <div id="jsResult" class="result"></div>
    <div id="jsOptions" class="options hidden">
      <form id="jsOptionsForm" action="#">
        <div>
          <label>
            <input type="checkbox" name="vimMode">
            Vim mode
          </label>
        </div>
        <div>
          <label>
            Tab width
            <input type="number" name="tabSize">
          </label>
        </div>
        <div>
          <label>
            Username
            <input type="text" name="username" maxlength="20">
          </label>
        </div>
        <button>Save</button>
      </form>
    </div>
  </main>

  <div id="jsConfirmModal" class="modal hidden">
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <p>Run this code?</p>
      <p class="modal-note">This code will be executed in your browser.</p>
      <pre class="modal-code-preview"><code id="jsConfirmCode"></code></pre>
      <div class="modal-buttons">
        <button id="jsConfirmRun" class="primary">Run <kbd>(Enter)</kbd></button>
        <button id="jsConfirmCancel">Cancel</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.3/lib/codemirror.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.3/mode/javascript/javascript.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.3/keymap/vim.js" integrity="sha256-3Vs/zwB+ju4BxOZ3amZj4qchA0O07FRuPntPcfYEQk8=" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.3/addon/edit/matchbrackets.js" integrity="sha256-K7D6LI9nbO/+XqhfEDHcvOL0kIxYNfzn8aFynPOqDHY=" crossorigin="anonymous"></script>
  <script>
    // Set global variables for the bundled JavaScript
    window.roomId = "${roomId}";
  </script>
  <script src="/dist/room.bundle.js"></script>
</body>
</html>`;
};
