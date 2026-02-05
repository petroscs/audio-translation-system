const { randomUUID } = require("crypto");
const { mediaCodecs } = require("./config");
const { getWorker, getWorkerById } = require("./workers");

const routersByKey = new Map();
const routersById = new Map();

async function createRouter({ key, workerId }) {
  const worker = workerId ? getWorkerById(workerId) : getWorker();
  if (!worker) {
    throw new Error("Worker not found.");
  }

  const router = await worker.createRouter({ mediaCodecs });
  const routerId = randomUUID();

  routersById.set(routerId, router);
  if (key) {
    routersByKey.set(key, routerId);
  }

  router.on("close", () => {
    routersById.delete(routerId);
    if (key) {
      routersByKey.delete(key);
    }
  });

  return { routerId, router };
}

async function getOrCreateRouter({ key, workerId }) {
  if (key && routersByKey.has(key)) {
    const existingRouterId = routersByKey.get(key);
    const router = existingRouterId ? routersById.get(existingRouterId) : undefined;
    if (router) {
      return { routerId: existingRouterId, router };
    }
  }

  return createRouter({ key, workerId });
}

function getRouterById(routerId) {
  return routersById.get(routerId);
}

async function getRouterStats(routerId) {
  const router = getRouterById(routerId);
  if (!router) {
    return null;
  }

  return router.dump();
}

function getRouterCount() {
  return routersById.size;
}

module.exports = {
  createRouter,
  getOrCreateRouter,
  getRouterById,
  getRouterStats,
  getRouterCount
};
