const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Notification,
  nativeImage,
  Menu,
  clipboard,
} = require("electron");
const path = require("path");
require("dotenv").config();

let mainWindow;
let tray = null;
let activeWindow;

// Initialize active-win before creating the window
async function initializeActiveWin() {
  try {
    activeWindow = (await import("active-win")).default;
    return true;
  } catch (error) {
    console.error("Failed to load active-win:", error);
    return false;
  }
}

async function createWindow() {
  // Initialize active-win first
  await initializeActiveWin();

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "icon.ico"),
  });

  mainWindow.loadFile("index.html");

  // Hide window instead of closing when user clicks X
  mainWindow.on("close", function (event) {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Register global shortcut
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    mainWindow.webContents.send("recording-toggle", false);
  });

  // Register translate shortcut
  globalShortcut.register("CommandOrControl+Shift+E", () => {
    mainWindow.webContents.send("recording-toggle", true);
  });

  // Register task recording shortcut
  globalShortcut.register("CommandOrControl+Shift+V", () => {
    mainWindow.webContents.send("record-task");
  });
}

function createTray() {
  // Create native image for tray icon
  const iconPath = path.join(__dirname, "icon.ico");
  const trayIcon = nativeImage.createFromPath(iconPath);

  if (trayIcon.isEmpty()) {
    console.error("Failed to load tray icon from:", iconPath);
    return;
  }

  tray = new Tray(trayIcon);
  tray.setToolTip(
    "Voice2Text\nCtrl+Shift+R to record\nCtrl+Shift+E to record & translate\nCtrl+Shift+V to record task"
  );

  // Add context menu to tray
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => mainWindow.show(),
    },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Handle tray click (Windows needs explicit show)
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

function showNotification(title, body) {
  new Notification({
    title,
    body,
    silent: true, // Make notifications silent
  }).show();
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

// Add IPC handler for tasks path
ipcMain.handle("get-tasks-path", () => {
  return path.join(app.getAppPath(), "Tasks");
});

// Modify notification handler to support Markdown
ipcMain.handle("show-notification", (_, { title, body }) => {
  new Notification({
    title,
    body: body.replace(/>/g, "→"), // Convert Markdown > to arrows
    silent: true,
  }).show();
});

ipcMain.on("auto-paste", async () => {
  try {
    // If active-win is not loaded, try to load it
    if (!activeWindow) {
      await initializeActiveWin();
    }

    // If still not loaded, fallback to simple paste
    if (!activeWindow) {
      mainWindow.webContents.paste();
      return;
    }

    // Get the currently active window
    const activeWin = await activeWindow();

    // Focus our window
    mainWindow.focus();
    mainWindow.show();

    // Small delay to ensure window is focused
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Send paste command
    mainWindow.webContents.paste();

    // Restore focus to previous window if it exists
    if (activeWin && activeWin.id) {
      // Give time for paste to complete
      setTimeout(() => {
        mainWindow.hide();
      }, 250);
    }
  } catch (error) {
    console.error("Error during auto-paste:", error);
    // Fallback to basic paste if something goes wrong
    mainWindow.webContents.paste();
  }
});

// Handle API key requests from renderer
ipcMain.handle("get-api-key", () => {
  return process.env.GEMINI_API_KEY;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Properly quit app
app.on("before-quit", () => {
  app.isQuitting = true;
});

// Unregister shortcuts when app quits
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
