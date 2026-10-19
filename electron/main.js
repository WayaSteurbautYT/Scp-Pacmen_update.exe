import { app, BrowserWindow, protocol, session, net } from "electron";
import { createServer as createNetServer } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRoomServer } from "../server/room-server.js";
import { PeerServer } from "peer";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const distRoot = path.join(appRoot, "dist");
const APP_SCHEME = "scp-pac";
let desktopRoomServer;
let desktopPeerServer;
let desktopRuntimeConfig = null;

function getLanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (!address.internal && address.family === "IPv4" && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address)) return address.address;
    }
  }
  return null;
}

async function findAvailablePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    const available = await new Promise((resolve) => {
      const probe = createNetServer();
      probe.once("error", () => resolve(false));
      probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`No free local port found near ${preferredPort}.`);
}

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

app.whenReady().then(async () => {
  app.setName("SCP-PAC_UPDATE");

  // Packaged desktop builds include a private local room backend so room
  // creation and voice signaling work without a separately installed server.
  if (app.isPackaged) {
    try {
      const roomPort = await findAvailablePort(3100);
      const peerPort = await findAvailablePort(9000);
      desktopRoomServer = createRoomServer({ host: "0.0.0.0", port: roomPort, voicePort: peerPort });
      await desktopRoomServer.listen();
      desktopRuntimeConfig = { roomServerUrl: `http://127.0.0.1:${roomPort}`, peerPort, lanIp: getLanAddress() };
      PeerServer({
        host: "0.0.0.0",
        port: peerPort,
        path: "/voice",
        key: "peerjs",
        allow_discovery: false,
        concurrent_limit: 12,
      }, (server) => {
        desktopPeerServer = server;
      });
    } catch (error) {
      console.error("Could not start the local room and voice services:", error);
    }
  }

  // Resolve scp-pac://app/<path> to a file inside dist, refusing anything that
  // escapes the build folder.
  protocol.handle(APP_SCHEME, (request) => {
    const relativePath = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "") || "index.html";
    if (relativePath === "desktop-config.js" && desktopRuntimeConfig) {
      return new Response(`window.__PACMAN_DESKTOP_CONFIG__ = ${JSON.stringify(desktopRuntimeConfig)};`, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    }
    const target = path.resolve(distRoot, relativePath);
    if (target !== distRoot && !target.startsWith(distRoot + path.sep)) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(target).toString()).then(async (response) => {
      if (relativePath !== "index.html" || !desktopRuntimeConfig) return response;
      const html = (await response.text()).replace("</head>", '  <script src="/desktop-config.js"></script>\n  </head>');
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      return new Response(html, { headers, status: response.status });
    });
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

app.on("before-quit", () => {
  desktopRoomServer?.close();
  desktopPeerServer?.close();
});
