"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const child_process_1 = require("child_process");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
let lastErrorCount = 0;
let lastPlayed = 0;
function activate(context) {
    console.log("FAAAH Extension is now active!");
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
    context.subscriptions.push(diagnosticListener);
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
    const cooldown = config.get("cooldownMs") || 1000;
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
//# sourceMappingURL=extension.js.map