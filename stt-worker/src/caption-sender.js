"use strict";

const axios = require("axios");
const config = require("./config");

async function sendCaption(sessionId, text, timestamp, confidence) {
  const url = `${config.backendApiUrl}/api/captions`;
  await axios.post(
    url,
    {
      sessionId,
      text,
      timestamp,
      confidence
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-STT-Worker-Key": config.sttWorkerApiKey
      },
      timeout: 5000
    }
  );
}

module.exports = { sendCaption };
