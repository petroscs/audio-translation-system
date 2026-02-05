class TransportCreated {
  TransportCreated({
    required this.transportId,
    required this.mediasoupTransportId,
    required this.iceParameters,
    required this.dtlsParameters,
  });

  final String transportId;
  final String mediasoupTransportId;
  final String iceParameters;
  final String dtlsParameters;

  factory TransportCreated.fromJson(Map<String, dynamic> json) {
    return TransportCreated(
      transportId: json['transportId'] as String,
      mediasoupTransportId: json['mediasoupTransportId'] as String,
      iceParameters: json['iceParameters'] as String,
      dtlsParameters: json['dtlsParameters'] as String,
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
      producerId: json['producerId'] as String,
      mediasoupProducerId: json['mediasoupProducerId'] as String,
    );
  }
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
      consumerId: json['consumerId'] as String,
      mediasoupConsumerId: json['mediasoupConsumerId'] as String,
      mediasoupProducerId: json['mediasoupProducerId'] as String,
      rtpParameters: json['rtpParameters'] as String,
    );
  }
}
