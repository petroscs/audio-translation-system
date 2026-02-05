const { closeConsumersForProducer } = require("./consumers");

const producersById = new Map();
const producerMetaById = new Map();

async function createProducer({ transport, routerId, kind, rtpParameters }) {
  const producer = await transport.produce({ kind, rtpParameters });

  producersById.set(producer.id, producer);
  producerMetaById.set(producer.id, {
    routerId,
    transportId: transport.id,
    kind
  });

  producer.on("close", () => {
    producersById.delete(producer.id);
    producerMetaById.delete(producer.id);
    closeConsumersForProducer(producer.id);
  });

  return producer;
}

function getProducerById(producerId) {
  return producersById.get(producerId);
}

function getProducerMeta(producerId) {
  return producerMetaById.get(producerId);
}

module.exports = {
  createProducer,
  getProducerById,
  getProducerMeta
};
