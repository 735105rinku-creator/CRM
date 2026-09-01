import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiService } from '../../core/services/api.service';

interface MeetingParticipant {
  name: string;
  userId?: string;
  code?: string;
  status?: string;
  department?: string;
  designation?: string;
}

interface MeetingDetail {
  meetingTitle?: string;
  meetingCode?: string;
  status?: string;
  currentUserJoinStatus?: string;
  chatMessages?: Array<{
    _id?: string;
    senderName?: string;
    message?: string;
    createdAt?: string;
  }>;
  attendees?: Array<{
    status?: string;
    userId?: { _id?: string; name?: string; email?: string; role?: string; department?: string; designation?: string; employeeCode?: string };
    employeeId?: {
      _id?: string;
      displayName?: string;
      employeeCode?: string;
      departmentId?: { departmentName?: string };
      designationId?: { designationName?: string };
    };
  }>;
}

interface JoinResponse {
  joined?: boolean;
  requiresApproval?: boolean;
  status?: string;
}

interface MeetingMessagesResponse {
  chatMessages?: NonNullable<MeetingDetail['chatMessages']>;
}

interface MediaParticipant {
  socketId: string;
  userId?: string;
  name: string;
  hasAudio: boolean;
  hasVideo: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  handRaised?: boolean;
}

interface RemoteTile extends MediaParticipant {
  stream: MediaStream;
}

type SignalPayload =
  | { type: 'offer'; description: RTCSessionDescriptionInit }
  | { type: 'answer'; description: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

interface PeerState {
  participant: MediaParticipant;
  connection: RTCPeerConnection;
  stream: MediaStream;
}

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meeting-room.component.html',
  styleUrls: ['./meeting-room.component.scss']
})
export class MeetingRoomComponent implements OnDestroy, OnInit, AfterViewChecked {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private stream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private socket: Socket | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private chatPollId: ReturnType<typeof setInterval> | null = null;
  private readonly peers = new Map<string, PeerState>();
  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
  };

  @ViewChild('localVideo') private localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChildren('remoteVideo') private remoteVideos?: QueryList<ElementRef<HTMLVideoElement>>;

  protected readonly meetingCode = signal(this.route.snapshot.paramMap.get('code') || 'MEETING');
  protected readonly meetingTitle = signal('Online meeting');
  protected readonly status = signal('Waiting to join');
  protected readonly message = signal('');
  protected readonly isJoined = signal(false);
  protected readonly audioEnabled = signal(true);
  protected readonly videoEnabled = signal(true);
  protected readonly hasAudio = signal(false);
  protected readonly hasVideo = signal(false);
  protected readonly isScreenSharing = signal(false);
  protected readonly handRaised = signal(false);
  protected readonly isSidePanelOpen = signal(true);
  protected readonly remoteTiles = signal<RemoteTile[]>([]);
  protected readonly participants = signal<MeetingParticipant[]>([]);
  protected readonly meetingDetail = signal<MeetingDetail | null>(null);
  protected readonly chatMessages = signal<NonNullable<MeetingDetail['chatMessages']>>([]);
  protected readonly chatDraft = signal('');
  protected readonly currentUser = computed(() => this.auth.currentUser());
  protected readonly isHost = computed(() => this.meetingDetail()?.currentUserJoinStatus === 'host');
  protected readonly canChat = computed(() => this.isJoined());
  protected readonly meetingCount = computed(() => this.remoteTiles().length + (this.isJoined() ? 1 : 0));
  protected readonly meetingLink = computed(() => (typeof window === 'undefined' ? '' : window.location.href));
  protected readonly visibleParticipants = computed(() => {
    return this.participants().filter((participant) => {
      if (['accepted', 'attended'].includes(participant.status || '')) return true;
      return this.isHost() && participant.status === 'requested';
    });
  });

  ngOnInit(): void {
    this.loadMeeting();
    this.pollId = setInterval(() => this.loadMeeting(true), 5000);
    this.chatPollId = setInterval(() => this.loadMessages(true), 2000);
  }

  ngAfterViewChecked(): void {
    this.attachRemoteVideos();
  }

  async join(): Promise<void> {
    this.message.set('');
    this.api.post<JoinResponse>(`/hr/meetings/${this.meetingCode()}/join`, {}).subscribe({
      next: async (response) => {
        if (response.requiresApproval) {
          this.status.set('Waiting for HR approval');
          this.message.set('Join request sent. HR/admin approval ke baad aap meeting join kar paayenge.');
          this.loadMeeting(true);
          return;
        }

        try {
          await this.startLocalMedia();
          await this.connectMeetingSocket();
          this.isJoined.set(true);
          this.status.set('Joined');
          this.loadMeeting(true);
          this.loadMessages(true);
        } catch (error) {
          this.message.set('Camera/mic ya meeting connection start nahi ho paaya. Browser permissions check karein.');
          this.stopLocalMedia();
        }
      },
      error: (error: { error?: { message?: string } }) => {
        this.message.set(error.error?.message || 'You are not allowed to join this meeting.');
      }
    });
  }

  protected toggleAudio(): void {
    const enabled = !this.audioEnabled();
    this.stream?.getAudioTracks().forEach((track) => (track.enabled = enabled));
    this.audioEnabled.set(enabled);
    this.emitMediaState();
  }

  protected toggleVideo(): void {
    const enabled = !this.videoEnabled();
    this.cameraStream?.getVideoTracks().forEach((track) => (track.enabled = enabled));
    if (!this.isScreenSharing()) {
      this.stream?.getVideoTracks().forEach((track) => (track.enabled = enabled));
    }
    this.videoEnabled.set(enabled);
    this.emitMediaState();
  }

  protected async toggleScreenShare(): Promise<void> {
    if (!this.isJoined()) return;

    if (this.isScreenSharing()) {
      await this.stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.message.set('Screen sharing is not supported in this browser.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = displayStream.getVideoTracks()[0];
      if (!track) return;

      this.screenTrack = track;
      await this.replaceOutgoingVideo(track);
      this.replaceLocalVideoTrack(track);
      this.isScreenSharing.set(true);
      this.hasVideo.set(true);
      this.videoEnabled.set(true);
      track.onended = () => void this.stopScreenShare();
      this.emitMediaState();
    } catch {
      this.message.set('Screen share start nahi ho paaya.');
    }
  }

  protected toggleHand(): void {
    if (!this.isJoined()) return;
    const raised = !this.handRaised();
    this.handRaised.set(raised);
    this.socket?.emit('meeting:hand-state', { handRaised: raised });
  }

  protected async copyMeetingLink(): Promise<void> {
    const link = this.meetingLink();
    if (!link) return;

    try {
      await navigator.clipboard?.writeText(link);
      this.message.set('Meeting link copied.');
    } catch {
      this.message.set(link);
    }
  }

  protected toggleSidePanel(): void {
    this.isSidePanelOpen.set(!this.isSidePanelOpen());
  }

  protected toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen?.();
  }

  protected leave(): void {
    if (this.isJoined()) {
      this.api.post(`/hr/meetings/${this.meetingCode()}/leave`, {}).subscribe({ error: () => undefined });
    }
    this.disconnectMeetingSocket();
    this.stopLocalMedia();
    void this.router.navigate([this.meetingSectionRoute()], {
      queryParams: { feature: 'meetings' },
      replaceUrl: true
    });
  }

  protected userName(): string {
    return this.currentUser()?.name || this.currentUser()?.email || 'Meeting user';
  }

  protected userDepartment(): string {
    const user = this.currentUser();
    const departmentRef = user?.departmentRef;
    if (departmentRef && typeof departmentRef === 'object') {
      return (departmentRef as { departmentName?: string }).departmentName || 'Department';
    }
    return this.userProfile().department || 'Department';
  }

  protected userDesignation(): string {
    return this.userProfile().designation || 'Designation';
  }

  protected participantStatusLabel(status?: string): string {
    if (status === 'attended') return 'Joined';
    if (status === 'requested') return 'Requested';
    if (status === 'accepted') return 'Allowed';
    if (status === 'declined') return 'Declined';
    return 'Invited';
  }

  protected rejectParticipant(participant: MeetingParticipant): void {
    if (!participant.code && !participant.userId) return;
    this.api
      .patch(`/hr/meetings/${this.meetingCode()}/join-request`, {
        employeeCode: participant.code,
        userId: participant.userId,
        status: 'declined'
      })
      .subscribe({
        next: () => {
          this.message.set(`${participant.name} request declined.`);
          this.loadMeeting(true);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to reject participant.')
      });
  }

  protected allowParticipant(participant: MeetingParticipant): void {
    if (!participant.code && !participant.userId) return;
    this.api
      .patch(`/hr/meetings/${this.meetingCode()}/join-request`, {
        employeeCode: participant.code,
        status: 'accepted'
      })
      .subscribe({
        next: () => {
          this.message.set(`${participant.name} can join now.`);
          this.loadMeeting(true);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to allow participant.')
      });
  }

  protected sendChat(): void {
    const message = this.chatDraft().trim();
    if (!message) return;

    this.api
      .post<MeetingDetail>(`/hr/meetings/${this.meetingCode()}/messages`, { message })
      .subscribe({
        next: (meeting) => {
          this.chatDraft.set('');
          this.applyMeeting(meeting);
          this.loadMessages(true);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to send message.')
      });
  }

  private async connectMeetingSocket(): Promise<void> {
    const token = this.auth.getAccessToken();
    if (!token) throw new Error('Missing auth token');

    this.disconnectMeetingSocket();

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    this.socket.on('meeting:participant-joined', (participant: MediaParticipant) => {
      this.message.set(`${participant.name} joined.`);
    });

    this.socket.on('meeting:participant-left', ({ socketId }: { socketId: string }) => {
      this.closePeer(socketId);
    });

    this.socket.on('meeting:media-state', (state: Partial<MediaParticipant> & { socketId: string }) => {
      this.updateRemoteTile(state.socketId, state);
    });

    this.socket.on('meeting:hand-state', (state: { socketId: string; handRaised: boolean }) => {
      this.updateRemoteTile(state.socketId, { handRaised: state.handRaised });
    });

    this.socket.on('meeting:signal', ({ fromSocketId, signal }: { fromSocketId: string; signal: SignalPayload }) => {
      void this.handleSignal(fromSocketId, signal);
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.once('connect_error', reject);
      this.socket?.once('connect', () => resolve());
    });

    await new Promise<void>((resolve, reject) => {
      this.socket?.emit(
        'meeting:join-room',
        {
          meetingCode: this.meetingCode(),
          name: this.userName(),
          hasAudio: this.hasAudio(),
          hasVideo: this.hasVideo(),
          audioEnabled: this.audioEnabled(),
          videoEnabled: this.videoEnabled(),
          handRaised: this.handRaised()
        },
        async (response: { ok: boolean; message?: string; participants?: MediaParticipant[] }) => {
          if (!response?.ok) {
            reject(new Error(response?.message || 'Unable to join meeting media.'));
            return;
          }

          for (const participant of response.participants || []) {
            await this.createPeer(participant, true);
          }
          resolve();
        }
      );
    });
  }

  private async createPeer(participant: MediaParticipant, createOffer: boolean): Promise<PeerState> {
    const existing = this.peers.get(participant.socketId);
    if (existing) return existing;

    const connection = new RTCPeerConnection(this.rtcConfig);
    const stream = new MediaStream();
    const state: PeerState = { participant, connection, stream };
    this.peers.set(participant.socketId, state);
    this.upsertRemoteTile(participant, stream);

    this.stream?.getTracks().forEach((track) => connection.addTrack(track, this.stream as MediaStream));

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(participant.socketId, { type: 'ice-candidate', candidate: event.candidate.toJSON() });
      }
    };

    connection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!stream.getTracks().some((item) => item.id === track.id)) {
          stream.addTrack(track);
        }
      });
      this.upsertRemoteTile(participant, stream);
    };

    connection.onconnectionstatechange = () => {
      if (['closed', 'disconnected', 'failed'].includes(connection.connectionState)) {
        this.closePeer(participant.socketId);
      }
    };

    if (createOffer) {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      this.sendSignal(participant.socketId, { type: 'offer', description: offer });
    }

    return state;
  }

  private async handleSignal(fromSocketId: string, signal: SignalPayload): Promise<void> {
    const participant = this.peers.get(fromSocketId)?.participant || {
      socketId: fromSocketId,
      name: 'Meeting user',
      hasAudio: true,
      hasVideo: true,
      audioEnabled: true,
      videoEnabled: true
    };
    const peer = await this.createPeer(participant, false);

    if (signal.type === 'offer') {
      await peer.connection.setRemoteDescription(signal.description);
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      this.sendSignal(fromSocketId, { type: 'answer', description: answer });
      return;
    }

    if (signal.type === 'answer') {
      await peer.connection.setRemoteDescription(signal.description);
      return;
    }

    if (signal.type === 'ice-candidate') {
      await peer.connection.addIceCandidate(signal.candidate);
    }
  }

  private sendSignal(targetSocketId: string, signal: SignalPayload): void {
    this.socket?.emit('meeting:signal', { targetSocketId, signal });
  }

  private emitMediaState(): void {
    this.socket?.emit('meeting:media-state', {
      hasAudio: this.hasAudio(),
      hasVideo: this.hasVideo(),
      audioEnabled: this.audioEnabled(),
      videoEnabled: this.videoEnabled()
    });
  }

  private async replaceOutgoingVideo(track: MediaStreamTrack | null): Promise<void> {
    const replacements = Array.from(this.peers.values()).map(async ({ connection }) => {
      const sender = connection.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(track);
      }
    });
    await Promise.all(replacements);
  }

  private replaceLocalVideoTrack(track: MediaStreamTrack): void {
    if (!this.stream) return;
    this.stream.getVideoTracks().forEach((oldTrack) => {
      this.stream?.removeTrack(oldTrack);
      if (oldTrack !== track && oldTrack.readyState !== 'ended') oldTrack.stop();
    });
    this.stream.addTrack(track);
    this.attachLocalVideo();
  }

  private async stopScreenShare(): Promise<void> {
    if (!this.isScreenSharing()) return;

    this.screenTrack?.stop();
    this.screenTrack = null;
    const cameraTrack = this.cameraStream?.getVideoTracks()[0] || null;
    await this.replaceOutgoingVideo(cameraTrack);

    if (this.stream) {
      this.stream.getVideoTracks().forEach((track) => this.stream?.removeTrack(track));
      if (cameraTrack) this.stream.addTrack(cameraTrack);
    }

    this.hasVideo.set(Boolean(cameraTrack));
    this.videoEnabled.set(Boolean(cameraTrack?.enabled));
    this.isScreenSharing.set(false);
    this.attachLocalVideo();
    this.emitMediaState();
  }

  private disconnectMeetingSocket(): void {
    this.peers.forEach((_, socketId) => this.closePeer(socketId));
    this.socket?.emit('meeting:leave-room');
    this.socket?.disconnect();
    this.socket = null;
    this.remoteTiles.set([]);
  }

  private closePeer(socketId: string): void {
    const peer = this.peers.get(socketId);
    peer?.connection.close();
    this.peers.delete(socketId);
    this.remoteTiles.set(this.remoteTiles().filter((tile) => tile.socketId !== socketId));
  }

  private stopLocalMedia(): void {
    this.screenTrack?.stop();
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.stream?.getTracks().forEach((track) => track.stop());
    this.screenTrack = null;
    this.cameraStream = null;
    this.stream = null;
    this.hasAudio.set(false);
    this.hasVideo.set(false);
    this.isScreenSharing.set(false);
    this.isJoined.set(false);
    this.status.set('Left meeting');
  }

  private userProfile(): { department?: string; designation?: string } {
    const profile = this.currentUser()?.profile;
    return profile && typeof profile === 'object' ? profile : {};
  }

  private loadMeeting(silent = false): void {
    this.api
      .get<MeetingDetail>(`/hr/meetings/${this.meetingCode()}`)
      .pipe(catchError((error) => {
        if (!silent) {
          this.message.set(error?.error?.message || 'Unable to load meeting.');
        }
        return of(null);
      }))
      .subscribe((meeting) => {
        if (!meeting) return;
        this.applyMeeting(meeting);
      });
  }

  private loadMessages(silent = false): void {
    this.api
      .get<MeetingMessagesResponse>(`/hr/meetings/${this.meetingCode()}/messages`)
      .pipe(catchError((error) => {
        if (!silent) {
          this.message.set(error?.error?.message || 'Unable to load messages.');
        }
        return of(null);
      }))
      .subscribe((data) => {
        if (!data) return;
        this.chatMessages.set(data.chatMessages || []);
      });
  }

  private async startLocalMedia(): Promise<void> {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = await this.getAvailableStream();
    this.cameraStream = this.stream ? new MediaStream(this.stream.getVideoTracks()) : null;
    this.hasAudio.set(Boolean(this.stream?.getAudioTracks().length));
    this.hasVideo.set(Boolean(this.stream?.getVideoTracks().length));
    this.audioEnabled.set(this.hasAudio());
    this.videoEnabled.set(this.hasVideo());
    this.attachLocalVideo();
    this.message.set('You are connected to this meeting room.');
  }

  private attachLocalVideo(): void {
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = this.stream;
    }
  }

  private attachRemoteVideos(): void {
    const tiles = this.remoteTiles();
    this.remoteVideos?.forEach((video, index) => {
      const stream = tiles[index]?.stream;
      if (stream && video.nativeElement.srcObject !== stream) {
        video.nativeElement.srcObject = stream;
      }
    });
  }

  private async getAvailableStream(): Promise<MediaStream | null> {
    if (!navigator.mediaDevices?.getUserMedia) return null;

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        return null;
      }
    }
  }

  private upsertRemoteTile(participant: MediaParticipant, stream: MediaStream): void {
    const tiles = this.remoteTiles();
    const existing = tiles.find((tile) => tile.socketId === participant.socketId);
    const next = existing
      ? tiles.map((tile) => (tile.socketId === participant.socketId ? { ...tile, ...participant, stream } : tile))
      : [...tiles, { ...participant, stream }];
    this.remoteTiles.set(next);
  }

  private updateRemoteTile(socketId: string, state: Partial<MediaParticipant>): void {
    this.remoteTiles.set(this.remoteTiles().map((tile) => (tile.socketId === socketId ? { ...tile, ...state } : tile)));
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.participant = { ...peer.participant, ...state };
    }
  }

  private applyMeeting(meeting: MeetingDetail): void {
    this.meetingTitle.set(meeting.meetingTitle || meeting.meetingCode || 'Online meeting');
    this.chatMessages.set(meeting.chatMessages || []);
    this.participants.set((meeting.attendees || []).map((attendee) => ({
      name: attendee.employeeId?.displayName || attendee.userId?.name || attendee.userId?.email || attendee.employeeId?.employeeCode || 'Invited user',
      code: attendee.employeeId?.employeeCode || attendee.userId?.employeeCode,
      userId: attendee.userId?._id,
      status: attendee.status || 'invited',
      department: attendee.employeeId?.departmentId?.departmentName || attendee.userId?.department,
      designation: attendee.employeeId?.designationId?.designationName || attendee.userId?.designation || attendee.userId?.role,
    })));

    if (meeting.currentUserJoinStatus === 'accepted' && !this.isJoined() && this.status() === 'Waiting for HR approval') {
      this.status.set('Approved - click Join');
      this.message.set('HR/admin ne allow kar diya hai. Join button dubara click karein.');
    }
  }

  private meetingSectionRoute(): string {
    const role = String(this.currentUser()?.role || '');
    if (['hr', 'company_admin', 'super_admin'].includes(role)) {
      return '/hr-dashboard';
    }
    return this.auth.isLogisticsUser() ? '/logistics/employee' : '/employee-dashboard';
  }

  ngOnDestroy(): void {
    if (this.pollId) clearInterval(this.pollId);
    if (this.chatPollId) clearInterval(this.chatPollId);
    this.disconnectMeetingSocket();
    this.stopLocalMedia();
  }
}


