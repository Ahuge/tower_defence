/**
 * WebRTC data channel wrapper for P2P game communication.
 *
 * Two connection modes:
 * 1. Signaling server (preferred): automatic SDP exchange via SignalingClient
 *    with trickle ICE for faster connection.
 * 2. Manual (fallback): copy-paste base64 SDP strings.
 */
import { SignalingClient } from './SignalingClient';

export type ConnectionState = 'idle' | 'hosting' | 'joining' | 'connected' | 'failed';

export class PeerConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private onMessage: ((data: string) => void) | null = null;
  private onStateChange: ((state: ConnectionState) => void) | null = null;
  state: ConnectionState = 'idle';

  constructor(
    onMessage: (data: string) => void,
    onStateChange: (state: ConnectionState) => void,
  ) {
    this.onMessage = onMessage;
    this.onStateChange = onStateChange;
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.setState('failed');
      }
    };

    return pc;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  private setupDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    dc.onopen = () => {
      this.setState('connected');
    };
    dc.onmessage = (event) => {
      this.onMessage?.(event.data);
    };
    dc.onclose = () => {
      this.setState('failed');
    };
  }

  // ===================== Signaling Server Mode =====================

  /**
   * HOST: Create offer and send via signaling server.
   * Uses trickle ICE for faster connection establishment.
   */
  async connectAsHost(signaling: SignalingClient, targetPlayer: number): Promise<void> {
    this.pc = this.createPeerConnection();
    this.setState('hosting');

    const dc = this.pc.createDataChannel('game', { ordered: true });
    this.setupDataChannel(dc);

    // Trickle ICE: send candidates as they're discovered
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.sendIce(JSON.stringify(event.candidate), targetPlayer);
      }
    };

    // Listen for answer and ICE from joiner
    signaling.onAnswer = async (sdp: string, fromPlayer: number) => {
      if (fromPlayer !== targetPlayer || !this.pc) return;
      try {
        await this.pc.setRemoteDescription(JSON.parse(sdp));
      } catch (e) {
        console.error('Failed to set remote description:', e);
      }
    };

    signaling.onIce = async (candidate: string, fromPlayer: number) => {
      if (fromPlayer !== targetPlayer || !this.pc) return;
      try {
        await this.pc.addIceCandidate(JSON.parse(candidate));
      } catch (e) {
        console.error('Failed to add ICE candidate:', e);
      }
    };

    // Create and send offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    signaling.sendOffer(JSON.stringify(this.pc.localDescription), targetPlayer);
  }

  /**
   * JOINER: Accept offer from signaling server and send answer back.
   * Uses trickle ICE for faster connection establishment.
   */
  async connectAsJoiner(signaling: SignalingClient, hostPlayer: number = 0): Promise<void> {
    this.pc = this.createPeerConnection();
    this.setState('joining');

    // Listen for data channel from host
    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    // Trickle ICE
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.sendIce(JSON.stringify(event.candidate), hostPlayer);
      }
    };

    // Listen for ICE from host
    signaling.onIce = async (candidate: string, fromPlayer: number) => {
      if (fromPlayer !== hostPlayer || !this.pc) return;
      try {
        await this.pc.addIceCandidate(JSON.parse(candidate));
      } catch (e) {
        console.error('Failed to add ICE candidate:', e);
      }
    };

    // Wait for offer from host
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for offer'));
      }, 30000);

      signaling.onOffer = async (sdp: string, fromPlayer: number) => {
        if (fromPlayer !== hostPlayer || !this.pc) return;
        clearTimeout(timeout);
        try {
          await this.pc.setRemoteDescription(JSON.parse(sdp));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          signaling.sendAnswer(JSON.stringify(this.pc.localDescription), hostPlayer);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
    });
  }

  // ===================== Manual Mode (Fallback) =====================

  /**
   * HOST: Create offer. Returns a base64 string to share with the joiner.
   * Call acceptAnswer() with the joiner's response.
   */
  async createOffer(): Promise<string> {
    this.pc = this.createPeerConnection();
    this.setState('hosting');

    const dc = this.pc.createDataChannel('game', { ordered: true });
    this.setupDataChannel(dc);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await this.waitForIceComplete();

    const sdp = JSON.stringify(this.pc.localDescription);
    return btoa(sdp);
  }

  /**
   * HOST: Accept the joiner's answer string.
   */
  async acceptAnswer(answerB64: string): Promise<void> {
    if (!this.pc) throw new Error('Not hosting');
    const answer = JSON.parse(atob(answerB64));
    await this.pc.setRemoteDescription(answer);
  }

  /**
   * JOIN: Accept a host's offer string. Returns a base64 answer to share back.
   */
  async acceptOffer(offerB64: string): Promise<string> {
    this.pc = this.createPeerConnection();
    this.setState('joining');

    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    const offer = JSON.parse(atob(offerB64));
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await this.waitForIceComplete();

    const sdp = JSON.stringify(this.pc.localDescription);
    return btoa(sdp);
  }

  // ===================== Common =====================

  send(data: string): void {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(data);
    }
  }

  sendJSON(obj: any): void {
    this.send(JSON.stringify(obj));
  }

  close(): void {
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
    this.setState('idle');
  }

  private waitForIceComplete(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.pc) return resolve();
      if (this.pc.iceGatheringState === 'complete') return resolve();
      const check = () => {
        if (this.pc?.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      this.pc.addEventListener('icegatheringstatechange', check);
      setTimeout(resolve, 5000);
    });
  }
}
