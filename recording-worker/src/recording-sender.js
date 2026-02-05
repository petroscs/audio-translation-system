"use strict";

const axios = require("axios");
const config = require("./config");

async function sendRecordingComplete(sessionId, filePath, durationSeconds) {
  const url = `${config.backendApiUrl}/api/recordings/complete`;
  await axios.post(
    url,
    {
      sessionId,
      filePath,
      durationSeconds
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Recording-Worker-Key": config.recordingWorkerApiKey
      },
      timeout: 10000
    }
  );
}

module.exports = { sendRecordingComplete };
