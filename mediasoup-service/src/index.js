const { createServer } = require("./server");
const { initializeWorkers } = require("./mediasoup/workers");
const { workerCount } = require("./mediasoup/config");

const port = Number.parseInt(process.env.PORT || "4000", 10);

async function start() {
  await initializeWorkers(workerCount);

  const app = createServer();
  app.listen(port, () => {
    console.log(`Mediasoup service listening on port ${port}.`);
  });
}

start().catch((error) => {
  console.error("Failed to start mediasoup service.", error);
  process.exitCode = 1;
});
