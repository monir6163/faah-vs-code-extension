import { exec } from "child_process";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

let lastErrorCount = 0;
let lastPlayed = 0;

export function activate(context: vscode.ExtensionContext) {
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

function countErrors(): number {
  const diagnostics = vscode.languages.getDiagnostics();
  let count = 0;
  for (const [, list] of diagnostics) {
    // সব ধরনের ডায়াগনস্টিক গণনা করা (Error, Warning, Info, Hint)
    count += list.length;
  }
  return count;
}

function playSound(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("faaah");
  if (!config.get("enabled", true)) return;

  const cooldown = config.get<number>("cooldownMs") || 1000;
  const now = Date.now();

  if (now - lastPlayed < cooldown) return;

  // সাউন্ড ফাইল প্লে করা (সিস্টেম কমান্ড দিয়ে)
  const soundPath = path.join(context.extensionPath, "media", "faaah.mp3");
  const platform = os.platform();

  let command: string;

  if (platform === "win32") {
    // Windows: PowerShell দিয়ে MP3 প্লে করা
    command = `powershell -c "Add-Type -AssemblyName presentationCore; $mediaPlayer = New-Object System.Windows.Media.MediaPlayer; $mediaPlayer.Open([System.Uri]'${soundPath}'); $mediaPlayer.Play(); Start-Sleep -Seconds 2"`;
  } else if (platform === "darwin") {
    // macOS: afplay কমান্ড (built-in)
    command = `afplay "${soundPath}"`;
  } else {
    // Linux: mpg123, ffplay বা paplay চেষ্টা করা
    command = `(mpg123 "${soundPath}" || ffplay -nodisp -autoexit "${soundPath}" || paplay "${soundPath}") 2>/dev/null &`;
  }

  exec(command, (error) => {
    if (error) {
      console.error("Sound play error:", error);
    }
  });

  lastPlayed = now;
}
