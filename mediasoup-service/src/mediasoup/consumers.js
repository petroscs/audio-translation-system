const consumersById = new Map();
const consumersByProducerId = new Map();

async function createConsumer({ transport, router, producerId, rtpCapabilities }) {
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error("Router cannot consume the provided producer.");
  }

  const consumer = await transport.consume({ producerId, rtpCapabilities });

  consumersById.set(consumer.id, consumer);
  const set = consumersByProducerId.get(producerId) ?? new Set();
  set.add(consumer.id);
  consumersByProducerId.set(producerId, set);

  consumer.on("close", () => {
    consumersById.delete(consumer.id);
    const current = consumersByProducerId.get(producerId);
    if (current) {
      current.delete(consumer.id);
      if (current.size === 0) {
        consumersByProducerId.delete(producerId);
      }
    }
  });

  return consumer;
}

function closeConsumersForProducer(producerId) {
  const consumerIds = consumersByProducerId.get(producerId);
  if (!consumerIds) {
    return;
  }

  for (const consumerId of consumerIds) {
    const consumer = consumersById.get(consumerId);
    if (consumer) {
      consumer.close();
    }
  }
}

module.exports = {
  createConsumer,
  closeConsumersForProducer
};
