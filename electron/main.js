const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");
const url = require("url");
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "assets/icon.png"),
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    url.format({
      pathname: "//localhost:5173",
      protocol: "http:",
      slashes: true,
    });
  mainWindow.loadURL(startUrl);
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
