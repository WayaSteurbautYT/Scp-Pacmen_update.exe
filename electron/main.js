import { app, BrowserWindow, protocol, session, net } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const distRoot = path.join(appRoot, "dist");
const APP_SCHEME = "scp-pac";

// The built game is served over a standard scheme instead of file:// because
// Phaser loads the SVG sprite atlases with XMLHttpRequest, and Chromium blocks
// XHR between file:// origins. Under file:// every atlas silently failed to
// load in the packaged build. Registration has to happen before app ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 820,
    minHeight: 700,
    backgroundColor: "#070d16",
    title: "SCP-PAC_UPDATE.EXE",
    icon: path.join(appRoot, "assets", "Scp-PAC_Update.exe.svg"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.PACMAN_DEV_SERVER_URL) {
    window.loadURL(process.env.PACMAN_DEV_SERVER_URL);
  } else {
    window.loadURL(`${APP_SCHEME}://app/index.html`);
  }
}

app.whenReady().then(() => {
  app.setName("SCP-PAC_UPDATE");

  // Resolve scp-pac://app/<path> to a file inside dist, refusing anything that
  // escapes the build folder.
  protocol.handle(APP_SCHEME, (request) => {
    const relativePath = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "") || "index.html";
    const target = path.resolve(distRoot, relativePath);
    if (target !== distRoot && !target.startsWith(distRoot + path.sep)) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(target).toString());
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = webContents.getURL();
    const trustedApp = url.startsWith(`${APP_SCHEME}://`) || url.startsWith("http://127.0.0.1:5173/");
    const requestsAudioOnly = details?.mediaTypes?.includes("audio") && !details.mediaTypes.includes("video");
    callback(permission === "media" && trustedApp && requestsAudioOnly);
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
