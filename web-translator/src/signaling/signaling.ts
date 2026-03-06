import * as signalR from '@microsoft/signalr';
import { getSignalingUrl } from '../api/config';

export interface TransportCreated {
  transportId: string;
  mediasoupTransportId: string;
  iceParameters: string;
  iceCandidates: string;
  dtlsParameters: string;
}

export interface ProducerCreated {
  producerId: string;
  mediasoupProducerId: string;
}

export class SignalingClient {
  private connection: signalR.HubConnection | null = null;

  constructor(private readonly accessToken: string) {}

  async start(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;
    if (this.connection?.state === signalR.HubConnectionState.Connecting) {
      await this.connection.start();
      return;
    }

    const url = getSignalingUrl(this.accessToken);
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        withCredentials: true,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
  }

  async stop(): Promise<void> {
    if (!this.connection) return;
    await this.connection.stop();
    this.connection = null;
  }

  async createTransport(sessionId: string, direction: 'Send' | 'Receive'): Promise<TransportCreated> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    const result = await this.connection.invoke<TransportCreated>('CreateTransport', {
      SessionId: sessionId,
      Direction: direction,
    });
    return result as TransportCreated;
  }

  async connectTransport(transportId: string, dtlsParameters: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    await this.connection.invoke('ConnectTransport', {
      TransportId: transportId,
      DtlsParameters: dtlsParameters,
    });
  }

  async produce(transportId: string, kind: 'Audio' | 'Video', rtpParameters: string): Promise<ProducerCreated> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    const result = await this.connection.invoke<ProducerCreated>('Produce', {
      TransportId: transportId,
      Kind: kind,
      RtpParameters: rtpParameters,
    });
    return result as ProducerCreated;
  }

  async joinSession(sessionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    await this.connection.invoke('JoinSession', sessionId);
  }
}

