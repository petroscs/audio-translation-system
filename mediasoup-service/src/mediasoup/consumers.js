const consumersById = new Map();
const consumersByProducerId = new Map();

async function createConsumer({ transport, router, producerId, rtpCapabilities }) {
  // `router.canConsume()` is a helpful pre-check but it can be overly strict depending on the
  // exact shape of `rtpCapabilities` or browser quirks. Prefer attempting the actual consume()
  // and only fail if consume() itself fails.
  try {
    const ok = router.canConsume({ producerId, rtpCapabilities });
    if (!ok) {
      // Best-effort diagnostics; do not block.
      const codecSummary = Array.isArray(rtpCapabilities?.codecs)
        ? rtpCapabilities.codecs.map((c) => `${c.mimeType ?? '?'}@${c.clockRate ?? '?'}/${c.channels ?? 1}`).join(', ')
        : '(no codecs)';
      console.warn(`[Consumer] canConsume()=false producerId=${producerId} caps=${codecSummary}`);
    }
  } catch (e) {
    console.warn(`[Consumer] canConsume() threw for producerId=${producerId}: ${e instanceof Error ? e.message : String(e)}`);
  }

  let consumer;
  try {
    consumer = await transport.consume({ producerId, rtpCapabilities });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`transport.consume() failed: ${msg}`);
  }

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
