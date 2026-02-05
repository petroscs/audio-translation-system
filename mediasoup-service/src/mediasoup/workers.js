const mediasoup = require("mediasoup");
const { randomUUID } = require("crypto");
const { rtcMinPort, rtcMaxPort } = require("./config");

const workers = [];
const workersById = new Map();
let nextWorkerIndex = 0;

async function createWorker() {
  const worker = await mediasoup.createWorker({ rtcMinPort, rtcMaxPort });
  const workerId = randomUUID();

  workers.push(worker);
  workersById.set(workerId, worker);

  worker.on("died", () => {
    console.error("Mediasoup worker died.", { workerId, pid: worker.pid });
  });

  return { workerId, worker };
}

async function initializeWorkers(count) {
  if (workers.length > 0) {
    return workers.length;
  }

  const createCount = Math.max(1, count);
  for (let index = 0; index < createCount; index += 1) {
    await createWorker();
  }

  return workers.length;
}

function getWorker() {
  if (workers.length === 0) {
    throw new Error("Mediasoup workers not initialized.");
  }

  const worker = workers[nextWorkerIndex % workers.length];
  nextWorkerIndex += 1;
  return worker;
}

function getWorkerById(workerId) {
  return workersById.get(workerId);
}

function getWorkerCount() {
  return workers.length;
}

module.exports = {
  createWorker,
  initializeWorkers,
  getWorker,
  getWorkerById,
  getWorkerCount
};
