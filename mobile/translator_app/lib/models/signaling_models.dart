class TransportCreated {
  TransportCreated({
    required this.transportId,
    required this.mediasoupTransportId,
    required this.iceParameters,
    required this.iceCandidates,
    required this.dtlsParameters,
  });

  final String transportId;
  final String mediasoupTransportId;
  final String iceParameters;
  final String iceCandidates;
  final String dtlsParameters;

  factory TransportCreated.fromJson(Map<String, dynamic> json) {
    return TransportCreated(
      transportId: _string(json, 'transportId', 'TransportId'),
      mediasoupTransportId: _string(json, 'mediasoupTransportId', 'MediasoupTransportId'),
      iceParameters: _string(json, 'iceParameters', 'IceParameters'),
      iceCandidates: _string(json, 'iceCandidates', 'IceCandidates'),
      dtlsParameters: _string(json, 'dtlsParameters', 'DtlsParameters'),
    );
  }
}

class ProducerCreated {
  ProducerCreated({
    required this.producerId,
    required this.mediasoupProducerId,
  });

  final String producerId;
  final String mediasoupProducerId;

  factory ProducerCreated.fromJson(Map<String, dynamic> json) {
    return ProducerCreated(
      producerId: _string(json, 'producerId', 'ProducerId'),
      mediasoupProducerId: _string(json, 'mediasoupProducerId', 'MediasoupProducerId'),
    );
  }
}

String _string(Map<String, dynamic> json, String camelKey, String pascalKey) {
  final value = json[camelKey] ?? json[pascalKey];
  if (value == null) {
    throw FormatException(
      'Missing key "$camelKey" or "$pascalKey" in SignalR response. Keys: ${json.keys.join(", ")}',
    );
  }
  if (value is String) return value;
  return value.toString();
}

class ConsumerCreated {
  ConsumerCreated({
    required this.consumerId,
    required this.mediasoupConsumerId,
    required this.mediasoupProducerId,
    required this.rtpParameters,
  });

  final String consumerId;
  final String mediasoupConsumerId;
  final String mediasoupProducerId;
  final String rtpParameters;

  factory ConsumerCreated.fromJson(Map<String, dynamic> json) {
    return ConsumerCreated(
      consumerId: _string(json, 'consumerId', 'ConsumerId'),
      mediasoupConsumerId: _string(json, 'mediasoupConsumerId', 'MediasoupConsumerId'),
      mediasoupProducerId: _string(json, 'mediasoupProducerId', 'MediasoupProducerId'),
      rtpParameters: _string(json, 'rtpParameters', 'RtpParameters'),
    );
  }
}
