import * as signalR from '@microsoft/signalr';
import { getSignalingUrl } from '../api/config';

export interface TransportCreated {
  transportId: string;
  mediasoupTransportId: string;
  iceParameters: string;
  iceCandidates: string;
  dtlsParameters: string;
}

export interface ConsumerCreated {
  consumerId: string;
  mediasoupConsumerId: string;
  mediasoupProducerId: string;
  rtpParameters: string;
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
        // Skip the negotiate POST; connect via WebSocket only. Avoids "Failed to fetch" on
        // some mobile browsers (e.g. Android) where the negotiate request fails.
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
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

  async consume(transportId: string, producerId: string): Promise<ConsumerCreated> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    const result = await this.connection.invoke<ConsumerCreated>('Consume', {
      TransportId: transportId,
      ProducerId: producerId,
    });
    return result as ConsumerCreated;
  }

  async joinSession(sessionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    await this.connection.invoke('JoinSession', sessionId);
  }

  async subscribeToBroadcastSession(sessionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected');
    }
    await this.connection.invoke('SubscribeToBroadcastSession', sessionId);
  }

  async unsubscribeFromBroadcastSession(sessionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke('UnsubscribeFromBroadcastSession', sessionId);
  }

  onCaption(callback: (caption: Record<string, unknown>) => void): void {
    this.connection?.on('Caption', (args: unknown[]) => {
      if (args?.[0] && typeof args[0] === 'object') {
        callback(args[0] as Record<string, unknown>);
      }
    });
  }

  offCaption(): void {
    this.connection?.off('Caption');
  }

  onActiveProducerChanged(callback: (sessionId: string, producerId: string) => void): void {
    this.connection?.on('ActiveProducerChanged', (args: unknown[]) => {
      if (args?.length >= 2) {
        callback(String(args[0]), String(args[1]));
      }
    });
  }

  offActiveProducerChanged(): void {
    this.connection?.off('ActiveProducerChanged');
  }
}
