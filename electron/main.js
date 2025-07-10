import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import url from 'url';
import isDev from 'electron-is-dev';

// Đăng ký scheme đặc quyền trước khi app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, corsEnabled: true, supportFetchAPI: true },
  },
]);

app.commandLine.appendSwitch('ignore-certificate-errors');

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow; // Khai báo biến có thể thay đổi ở đây

function createWindow() {
  // Gán giá trị cho biến đã khai báo, không tạo biến mới
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  
  const startUrl = isDev
    ? 'https://192.168.194.169:5173'
    : 'app://./index.html';

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const filePath = path.join(__dirname, 'dist', new url.URL(request.url).pathname);
    callback(filePath);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) { 
    createWindow();
  }
});