"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const child_process_1 = require("child_process");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
let lastErrorCount = 0;
let lastPlayed = 0;
let statusBarItem;
function activate(context) {
    console.log("FAAAH Extension is now active!");
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "faaah.toggleMute";
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Register toggle mute command
    const toggleMuteCommand = vscode.commands.registerCommand("faaah.toggleMute", () => {
        toggleMute();
    });
    context.subscriptions.push(toggleMuteCommand);
    // Listen for configuration changes
    const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("faaah")) {
            updateStatusBar();
        }
    });
    context.subscriptions.push(configListener);
    // প্রথমবার চালু হওয়ার সময় এরর সংখ্যা দেখে নেওয়া
    lastErrorCount = countErrors();
    // এরর পরিবর্তন পর্যবেক্ষণ করা
    const diagnosticListener = vscode.languages.onDidChangeDiagnostics(() => {
        const currentCount = countErrors();
        // যদি নতুন এরর যোগ হয় তবে শব্দ বাজাও
        if (currentCount > lastErrorCount) {
            playSound(context);
        }
        lastErrorCount = currentCount;
    });
    // টাস্ক শেষ হওয়ার পর পর্যবেক্ষণ করা (npm run build, tsc, vite, jest etc.)
    const taskListener = vscode.tasks.onDidEndTaskProcess((event) => {
        // যদি টাস্ক ব্যর্থ হয় (exit code ≠ 0)
        if (event.exitCode !== 0) {
            playSound(context);
        }
    });
    context.subscriptions.push(diagnosticListener, taskListener);
}
function countErrors() {
    const diagnostics = vscode.languages.getDiagnostics();
    let count = 0;
    for (const [, list] of diagnostics) {
        // সব ধরনের ডায়াগনস্টিক গণনা করা (Error, Warning, Info, Hint)
        count += list.length;
    }
    return count;
}
function playSound(context) {
    const config = vscode.workspace.getConfiguration("faaah");
    if (!config.get("enabled", true))
        return;
    if (config.get("muted", false))
        return;
    const cooldown = config.get("cooldownMs") || 1500;
    const now = Date.now();
    if (now - lastPlayed < cooldown)
        return;
    // সাউন্ড ফাইল প্লে করা (সিস্টেম কমান্ড দিয়ে)
    const soundPath = path.join(context.extensionPath, "media", "faaah.mp3");
    const platform = os.platform();
    let command;
    if (platform === "win32") {
        // Windows: PowerShell দিয়ে MP3 প্লে করা
        command = `powershell -c "Add-Type -AssemblyName presentationCore; $mediaPlayer = New-Object System.Windows.Media.MediaPlayer; $mediaPlayer.Open([System.Uri]'${soundPath}'); $mediaPlayer.Play(); Start-Sleep -Seconds 2"`;
    }
    else if (platform === "darwin") {
        // macOS: afplay কমান্ড (built-in)
        command = `afplay "${soundPath}"`;
    }
    else {
        // Linux: mpg123, ffplay বা paplay চেষ্টা করা
        command = `(mpg123 "${soundPath}" || ffplay -nodisp -autoexit "${soundPath}" || paplay "${soundPath}") 2>/dev/null &`;
    }
    (0, child_process_1.exec)(command, (error) => {
        if (error) {
            console.error("Sound play error:", error);
        }
    });
    lastPlayed = now;
}
function toggleMute() {
    const config = vscode.workspace.getConfiguration("faaah");
    const currentMuted = config.get("muted", false);
    config.update("muted", !currentMuted, vscode.ConfigurationTarget.Global);
    updateStatusBar();
    const message = !currentMuted
        ? "🔇 FAAAH sounds muted"
        : "🔊 FAAAH sounds unmuted";
    vscode.window.showInformationMessage(message);
}
function updateStatusBar() {
    const config = vscode.workspace.getConfiguration("faaah");
    const isMuted = config.get("muted", false);
    const isEnabled = config.get("enabled", true);
    if (!isEnabled) {
        statusBarItem.text = "⚠️ FAAAH OFF";
        statusBarItem.tooltip = "FAAAH is disabled. Enable in settings to use.";
        statusBarItem.backgroundColor = undefined;
    }
    else if (isMuted) {
        statusBarItem.text = "🔇 FAAAH";
        statusBarItem.tooltip = "🔇 Sounds are muted. Click to unmute.";
        statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    }
    else {
        statusBarItem.text = "🔊 FAAAH";
        statusBarItem.tooltip = "🔊 Sounds are active. Click to mute.";
        statusBarItem.backgroundColor = undefined;
    }
}
//# sourceMappingURL=extension.js.map