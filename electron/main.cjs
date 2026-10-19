/**
 * MD Studio — Electron main process.
 *
 * The studio is a Next.js app with two API routes that touch the filesystem
 * (image serving and TODO notes), so the desktop build runs the Next server
 * as a child process instead of shipping a static export: every page and both
 * API routes keep working unchanged.
 *
 * The vault folder is chosen in a native dialog and remembered; switching it
 * restarts the server with a new DOCS_DIR.
 */

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const IS_DEV = !app.isPackaged;
const HOST = "127.0.0.1";

/** Where the app keeps its own files (chosen vault, window bounds). */
const userDataDir = () => app.getPath("userData");
const settingsFile = () => path.join(userDataDir(), "settings.json");
const logFile = () => path.join(userDataDir(), "md-studio.log");

/** Writes to the log file and to the console. A packaged app has no console. */
function logLine(...parts) {
  const line = parts.map(String).join(" ");
  console.log(line);
  try {
    fs.mkdirSync(userDataDir(), { recursive: true });
    fs.appendFileSync(logFile(), `${new Date().toISOString()} ${line}\n`, "utf-8");
  } catch {
    /* the log is a convenience, never a reason to fail */
  }
}

/** Bundled demo vault: inside the repo in dev, next to the app in the package. */
function demoVaultDir() {
  if (IS_DEV) return path.join(__dirname, "..", "vault");
  return path.join(app.getAppPath(), "vault");
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  fs.mkdirSync(userDataDir(), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

/** The vault the studio reads right now: the chosen folder, or the demo one. */
function currentVaultDir(settings = loadSettings()) {
  const chosen = settings.vaultDir;
  if (chosen && fs.existsSync(chosen)) return chosen;
  return demoVaultDir();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForPort(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: HOST });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error("the Next server did not start in time"));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

/** The child process that serves the studio. */
let serverProcess = null;
let serverPort = null;

function serverCommand(vaultDir, port) {
  if (IS_DEV) {
    // next dev, started through the bundled next binary
    const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
    return { command: process.execPath, args: [nextBin, "dev", "--port", String(port)] };
  }
  // the standalone server produced by `next build`
  const serverJs = path.join(app.getAppPath(), ".next", "standalone", "server.js");
  return { command: process.execPath, args: [serverJs] };
}

async function startServer(vaultDir) {
  const port = await freePort();
  const { command, args } = serverCommand(vaultDir, port);

  const child = spawn(command, args, {
    cwd: IS_DEV ? path.join(__dirname, "..") : path.join(app.getAppPath(), ".next", "standalone"),
    env: {
      ...process.env,
      // Electron can act as plain Node for the child process.
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      HOSTNAME: HOST,
      NODE_ENV: IS_DEV ? "development" : "production",
      DOCS_DIR: vaultDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const log = (stream, prefix) => {
    stream.on("data", (chunk) => {
      for (const line of String(chunk).split("\n")) {
        if (line.trim()) logLine(`[${prefix}] ${line}`);
      }
    });
  };
  log(child.stdout, "next");
  log(child.stderr, "next");

  child.on("exit", (code) => {
    if (serverProcess === child) {
      serverProcess = null;
      logLine(`[next] server exited with code ${code}`);
    }
  });

  serverProcess = child;
  serverPort = port;
  await waitForPort(port);
  return port;
}

function stopServer() {
  if (!serverProcess) return;
  const child = serverProcess;
  serverProcess = null;
  try {
    child.kill();
  } catch {
    /* already gone */
  }
}

let mainWindow = null;

async function createWindow() {
  const settings = loadSettings();
  const vaultDir = currentVaultDir(settings);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b1220",
    show: false,
    title: "MD Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // External links open in the browser, not in the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const port = await startServer(vaultDir);
  await mainWindow.loadURL(`http://${HOST}:${port}/docs`);

  // Development helper: MD_STUDIO_SCREENSHOT=<file> saves a picture of the
  // window and quits. Used to refresh the screenshot in the README.
  if (process.env.MD_STUDIO_SCREENSHOT && mainWindow) {
    setTimeout(async () => {
      try {
        const image = await mainWindow.webContents.capturePage();
        fs.writeFileSync(process.env.MD_STUDIO_SCREENSHOT, image.toPNG());
        logLine(`[screenshot] ${process.env.MD_STUDIO_SCREENSHOT}`);
      } finally {
        app.quit();
      }
    }, Number(process.env.MD_STUDIO_SCREENSHOT_DELAY || 6000));
  }
}

ipcMain.handle("vault:current", () => ({
  vaultDir: currentVaultDir(),
  isDefault: currentVaultDir() === demoVaultDir(),
  platform: process.platform,
}));

ipcMain.handle("vault:choose", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Выберите папку с Markdown-документацией",
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "Открыть",
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { vaultDir: currentVaultDir(), changed: false };
  }

  const vaultDir = result.filePaths[0];
  const settings = loadSettings();
  settings.vaultDir = vaultDir;
  saveSettings(settings);

  // The vault path is resolved when the server starts, so the server is
  // restarted and the page reloaded.
  stopServer();
  const port = await startServer(vaultDir);
  if (mainWindow) {
    await mainWindow.loadURL(`http://${HOST}:${port}/docs`);
  }
  return { vaultDir, changed: true };
});

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopServer);
