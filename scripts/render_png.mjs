import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    webPreferences: { offscreen: true }
  });

  const svgContent = fs.readFileSync(path.join(__dirname, '../test_frame.svg'), 'utf8');
  const html = `<!DOCTYPE html><html><body style="margin:0;background:transparent;display:grid;place-items:center;height:100vh;">
    <div style="width:128px;height:128px;">${svgContent}</div>
  </body></html>`;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise(r => setTimeout(r, 200));

  const image = await win.capturePage({ x: 64, y: 64, width: 128, height: 128 });
  fs.writeFileSync(path.join(__dirname, '../test_frame.png'), image.toPNG());
  console.log('Saved test_frame.png successfully!');
  app.quit();
});
