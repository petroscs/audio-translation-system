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

  // Monitor producer stats to verify audio is being received
  if (kind === "audio") {
    console.log(`[Producer ${producer.id}] Audio producer created`);
    
    // Set up periodic stats monitoring
    const statsInterval = setInterval(async () => {
      try {
        const stats = await producer.getStats();
        // Look for audio stats
      for (const stat of stats) {
          if (stat.type === "outbound-rtp" || stat.type === "media-source") {
            const bytesSent = stat.bytesSent || stat.bytes || 0;
            const packetsSent = stat.packetsSent || stat.packets || 0;
            if (bytesSent > 0 || packetsSent > 0) {
              console.log(`[Producer ${producer.id}] Audio stats - Bytes: ${bytesSent}, Packets: ${packetsSent}`);
            }
          }
        }
      } catch (error) {
        // Stats might not be available immediately
      }
    }, 5000); // Check every 5 seconds

    producer.on("close", () => {
      clearInterval(statsInterval);
      producersById.delete(producer.id);
      producerMetaById.delete(producer.id);
      closeConsumersForProducer(producer.id);
      console.log(`[Producer ${producer.id}] Producer closed`);
    });
  } else {
    producer.on("close", () => {
      producersById.delete(producer.id);
      producerMetaById.delete(producer.id);
      closeConsumersForProducer(producer.id);
    });
  }

  return producer;
}

function getProducerById(producerId) {
  return producersById.get(producerId);
}

function getProducerMeta(producerId) {
  return producerMetaById.get(producerId);
}

async function getProducerStats(producerId) {
  const producer = getProducerById(producerId);
  if (!producer) {
    return null;
  }

  try {
    const stats = await producer.getStats();
    const result = {
      producerId,
      kind: producer.kind,
      paused: producer.paused,
      closed: producer.closed,
      stats: []
    };

    for (const stat of stats) {
      const statData = {
        type: stat.type,
        id: stat.id,
        timestamp: stat.timestamp,
        values: {}
      };

      // Extract relevant values
      if (stat.type === "outbound-rtp" || stat.type === "media-source") {
        statData.values = {
          bytesSent: stat.bytesSent || stat.bytes || 0,
          packetsSent: stat.packetsSent || stat.packets || 0,
          bytesReceived: stat.bytesReceived || 0,
          packetsReceived: stat.packetsReceived || 0,
          audioLevel: stat.audioLevel || null,
          totalAudioEnergy: stat.totalAudioEnergy || null,
          totalSamplesDuration: stat.totalSamplesDuration || null,
        };
      } else {
        // Include all values for other stat types
        statData.values = stat;
      }

      result.stats.push(statData);
    }

    return result;
  } catch (error) {
    console.error(`[Producer ${producerId}] Error getting stats:`, error);
    return { producerId, error: error.message };
  }
}

module.exports = {
  createProducer,
  getProducerById,
  getProducerMeta,
  getProducerStats
};
