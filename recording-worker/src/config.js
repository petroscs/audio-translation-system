"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getWindowsPathWithUserEnv() {
  let pathEnv = process.env.PATH || process.env.Path || "";
  try {
    const out = execSync('reg query "HKCU\\Environment" /v Path 2>nul', {
      encoding: "utf8",
      timeout: 2000,
      windowsHide: true
    });
    const match = out.match(/Path\s+REG_\w+\s+(.+)/);
    if (match) {
      const userPath = match[1].trim();
      if (userPath) pathEnv = pathEnv + ";" + userPath;
    }
  } catch (_) {
    /* ignore */
  }
  return pathEnv;
}

function searchCommonFfmpegLocations() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const candidates = [
    path.join(localAppData, "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    path.join(programFiles, "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "ffmpeg", "bin", "ffmpeg.exe"),
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    path.join(localAppData, "Programs", "ffmpeg", "bin", "ffmpeg.exe")
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  const winGetPackages = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  if (fs.existsSync(winGetPackages)) {
    try {
      const dirs = fs.readdirSync(winGetPackages, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory() || !d.name.toLowerCase().includes("ffmpeg")) continue;
        const binPath = path.join(winGetPackages, d.name, "bin", "ffmpeg.exe");
        if (fs.existsSync(binPath)) return binPath;
        const rootPath = path.join(winGetPackages, d.name, "ffmpeg.exe");
        if (fs.existsSync(rootPath)) return rootPath;
        const subdirs = fs.readdirSync(path.join(winGetPackages, d.name), { withFileTypes: true });
        for (const sub of subdirs) {
          if (!sub.isDirectory()) continue;
          const p = path.join(winGetPackages, d.name, sub.name, "bin", "ffmpeg.exe");
          if (fs.existsSync(p)) return p;
        }
      }
    } catch (_) {
      /* ignore */
    }
  }
  return null;
}

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }
  if (process.platform !== "win32") {
    return "ffmpeg";
  }
  try {
    const pathEnv = getWindowsPathWithUserEnv();
    const out = execSync("where ffmpeg", {
      encoding: "utf8",
      timeout: 3000,
      shell: true,
      env: { ...process.env, PATH: pathEnv, Path: pathEnv }
    });
    const first = out.split(/\r?\n/)[0]?.trim();
    if (first && path.isAbsolute(first)) {
      return first;
    }
  } catch (_) {
    /* ignore */
  }
  const found = searchCommonFfmpegLocations();
  if (found) return found;
  return "ffmpeg.exe";
}

function resolveFfprobePath(ffmpegResolved) {
  if (process.env.FFPROBE_PATH) {
    return process.env.FFPROBE_PATH;
  }
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  }
  if (process.platform !== "win32") {
    return "ffprobe";
  }
  if (ffmpegResolved !== "ffmpeg.exe" && path.isAbsolute(ffmpegResolved)) {
    return path.join(path.dirname(ffmpegResolved), "ffprobe.exe");
  }
  try {
    const pathEnv = getWindowsPathWithUserEnv();
    const out = execSync("where ffprobe", {
      encoding: "utf8",
      timeout: 3000,
      shell: true,
      env: { ...process.env, PATH: pathEnv, Path: pathEnv }
    });
    const first = out.split(/\r?\n/)[0]?.trim();
    if (first && path.isAbsolute(first)) {
      return first;
    }
  } catch (_) {
    /* ignore */
  }
  return "ffprobe.exe";
}

const ffmpegPath = resolveFfmpegPath();
const ffprobePath = resolveFfprobePath(ffmpegPath);

const config = {
  port: Number.parseInt(process.env.PORT || "5003", 10),
  rtpHost: process.env.RECORDING_WORKER_HOST || process.env.HOSTNAME || "localhost",
  mediasoupApiUrl: process.env.MEDIASOUP_API_URL || "http://localhost:4000",
  backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:5000",
  recordingWorkerApiKey: process.env.RECORDING_WORKER_API_KEY || "recording-worker-secret",
  recordingsPath: process.env.RECORDINGS_PATH || "../recordings",
  maxConcurrentSessions: Number.parseInt(process.env.MAX_CONCURRENT_SESSIONS || "10", 10),
  ffmpegPath,
  ffprobePath
};

module.exports = config;
