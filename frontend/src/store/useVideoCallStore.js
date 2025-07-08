import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useVideoCallStore = create((set, get) => ({
  // State
  isCallActive: false,
  incomingCall: null,
  callRoom: null,
  targetUserId: null, // Store target user ID for calls
  localStream: null,
  remoteStream: null,
  peer: null,
  isMuted: false,
  isVideoOff: false,
  callStatus: 'idle', // idle, calling, ringing, connected, ended
  
  // Actions
  initiateCall: (targetUser) => {
    console.log("[VIDEO CALL STORE] *** INITIATING CALL ***");
    console.log("[VIDEO CALL STORE] Target user:", targetUser.fullName);
    console.log("[VIDEO CALL STORE] Target user ID:", targetUser._id);
    
    const { socket, authUser } = useAuthStore.getState();
    console.log("[VIDEO CALL STORE] Socket available:", !!socket);
    console.log("[VIDEO CALL STORE] Auth user:", authUser?._id);
    
    if (!socket || !authUser) {
      toast.error("Connection not available");
      return;
    }

    set({ 
      callStatus: 'calling',
      isCallActive: true,
      targetUserId: targetUser._id // Store target user ID
    });

    // Send call request via socket
    console.log("[VIDEO CALL STORE] Emitting video-call-request...");
    socket.emit("video-call-request", {
      targetUserId: targetUser._id,
      callerInfo: {
        id: authUser._id,
        name: authUser.fullName,
        profilePic: authUser.profilePic
      }
    });
    console.log("[VIDEO CALL STORE] video-call-request emitted");
  },

  acceptCall: (roomId) => {
    console.log("[VIDEO CALL STORE] Accepting call for room:", roomId);
    
    const { socket } = useAuthStore.getState();
    if (!socket) {
      toast.error("Connection not available");
      return;
    }

    socket.emit("accept-video-call", { roomId });
    
    set({ 
      callStatus: 'connected',
      isCallActive: true,
      callRoom: roomId,
      incomingCall: null
    });
  },

  rejectCall: (roomId, reason = "User declined") => {
    console.log("[VIDEO CALL STORE] Rejecting call for room:", roomId);
    
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    socket.emit("reject-video-call", { roomId, reason });
    
    set({ 
      incomingCall: null,
      callStatus: 'idle'
    });
  },

  endCall: () => {
    console.log("[VIDEO CALL STORE] Ending call");
    
    const { callRoom, localStream, peer } = get();
    const { socket } = useAuthStore.getState();

    // Clean up local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Clean up peer connection
    if (peer) {
      peer.destroy();
    }

    // Notify server
    if (socket && callRoom) {
      socket.emit("end-video-call", { roomId: callRoom });
    }

    // Reset state
    set({
      isCallActive: false,
      incomingCall: null,
      callRoom: null,
      targetUserId: null,
      localStream: null,
      remoteStream: null,
      peer: null,
      isMuted: false,
      isVideoOff: false,
      callStatus: 'idle'
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // Toggle: if muted, enable it
        set({ isMuted: !isMuted });
      }
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff; // Toggle: if video off, enable it
        set({ isVideoOff: !isVideoOff });
      }
    }
  },

  setIncomingCall: (callData) => {
    console.log("[VIDEO CALL STORE] Incoming call:", callData);
    set({ 
      incomingCall: callData,
      callStatus: 'ringing'
    });
  },

  setCallRoom: (roomId) => {
    set({ callRoom: roomId });
  },

  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  setRemoteStream: (stream) => {
    set({ remoteStream: stream });
  },

  setPeer: (peer) => {
    set({ peer });
  },

  setCallStatus: (status) => {
    set({ callStatus: status });
  },

  // Cleanup function
  cleanup: () => {
    const { localStream, peer } = get();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peer) {
      peer.destroy();
    }
    
    set({
      isCallActive: false,
      incomingCall: null,
      callRoom: null,
      targetUserId: null,
      localStream: null,
      remoteStream: null,
      peer: null,
      isMuted: false,
      isVideoOff: false,
      callStatus: 'idle'
    });
  }
})); 