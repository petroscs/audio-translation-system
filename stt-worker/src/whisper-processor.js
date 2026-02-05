"use strict";

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const config = require("./config");

const CHUNK_DURATION_MS = 30000;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const CHUNK_SIZE = Math.floor((SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_DURATION_MS) / 1000);

function createWhisperProcessor(onCaption, logger) {
  let buffer = Buffer.alloc(0);
  let processing = false;
  let closed = false;

  const processChunk = () => {
    if (processing || closed || buffer.length < CHUNK_SIZE) {
      return;
    }

    const chunk = buffer.subarray(0, CHUNK_SIZE);
    buffer = buffer.subarray(CHUNK_SIZE);
    processing = true;

    const tmpDir = os.tmpdir();
    const baseName = `whisper-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inputPath = path.join(tmpDir, `${baseName}.raw`);

    fs.writeFileSync(inputPath, chunk);

    const whisperArgs = [
      inputPath,
      "--model",
      config.whisperModel,
      "--language",
      "auto",
      "--output_format",
      "json",
      "--output_dir",
      tmpDir
    ];

    const cp = spawn("whisper", whisperArgs, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";

    cp.stderr?.on("data", (d) => {
      stderr += d.toString();
    });

    cp.on("close", (code) => {
      processing = false;
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        /* ignore */
      }

      if (code !== 0) {
        logger?.warn({ code, stderr }, "Whisper exited with error");
        return;
      }

      try {
        const jsonPath = path.join(tmpDir, `${baseName}.json`);
        if (fs.existsSync(jsonPath)) {
          const content = fs.readFileSync(jsonPath, "utf8");
          const result = JSON.parse(content);
          const text = (result.text || "").trim();
          if (text && onCaption) {
            const startMs = (result.segments?.[0]?.start ?? 0) * 1000;
            const endMs = (result.segments?.[result.segments?.length - 1]?.end ?? 0) * 1000;
            const timestamp = Date.now();
            onCaption({ text, startMs, endMs, timestamp, confidence: 0.95 });
          }
          fs.unlinkSync(jsonPath);
        }
      } catch (e) {
        logger?.warn({ err: e.message }, "Failed to parse Whisper output");
      }
    });
  };

  return {
    addPcm(data) {
      if (closed) return;
      buffer = Buffer.concat([buffer, data]);
      processChunk();
    },

    close() {
      closed = true;
      buffer = Buffer.alloc(0);
    }
  };
}

module.exports = { createWhisperProcessor };
