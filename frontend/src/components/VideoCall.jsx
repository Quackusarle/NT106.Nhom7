import { useEffect, useRef, useState } from 'react';
import { useVideoCallStore } from '../store/useVideoCallStore.js';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import Peer from 'simple-peer';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoCall = () => {
  const {
    isCallActive,
    incomingCall,
    callRoom,
    targetUserId,
    localStream,
    remoteStream,
    peer,
    isMuted,
    isVideoOff,
    callStatus,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    setLocalStream,
    setRemoteStream,
    setPeer,
    setCallRoom,
    setCallStatus,
    setIncomingCall
  } = useVideoCallStore();

  const { socket, authUser } = useAuthStore();
  const { selectedUser } = useChatStore();

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isInitiating, setIsInitiating] = useState(false);

  // Initialize media stream
  useEffect(() => {
    if (isCallActive && !localStream) {
      initializeMedia();
    }
  }, [isCallActive]);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    const handleCallInitiated = ({ roomId }) => {
      console.log("[VIDEO CALL] *** CALL INITIATED ***");
      console.log("[VIDEO CALL] Room ID:", roomId);
      console.log("[VIDEO CALL] Setting call room and initiating state...");
      setCallRoom(roomId);
      useVideoCallStore.getState().setCallRoom(roomId); // Also set in store
      setIsInitiating(true);
      console.log("[VIDEO CALL] Call room set to:", roomId);
    };

    const handleCallAccepted = ({ roomId }) => {
      console.log("[VIDEO CALL] *** CALL ACCEPTED ***");
      console.log("[VIDEO CALL] Room ID:", roomId);
      console.log("[VIDEO CALL] Current call room:", callRoom);
      
      // Set room first
      setCallRoom(roomId);
      setCallStatus('connected');
      
      // Wait a moment to ensure local stream and room state are ready
      setTimeout(() => {
        const currentStream = useVideoCallStore.getState().localStream;
        const currentTargetUserId = useVideoCallStore.getState().targetUserId;
        if (currentStream) {
          console.log("[VIDEO CALL] Caller creating peer connection with stream:", currentStream.id);
          console.log("[VIDEO CALL] About to initiate peer connection as caller...");
          console.log("[VIDEO CALL] Using room ID for caller:", roomId);
          console.log("[VIDEO CALL] Target user from store:", currentTargetUserId);
          initiatePeerConnection(true, currentStream, roomId, currentTargetUserId); // Pass roomId and targetUserId directly
        } else {
          console.error("[VIDEO CALL] Caller: No local stream available");
          console.log("[VIDEO CALL] Debug - Available streams:", {
            localFromState: localStream,
            localFromStore: useVideoCallStore.getState().localStream
          });
          toast.error("Media stream not ready");
        }
      }, 500);
    };

    const handleCallRejected = ({ reason }) => {
      console.log("[VIDEO CALL] Call rejected:", reason);
      toast.error(`Call rejected: ${reason}`);
      endCall();
    };

    const handleSignal = ({ signalData, fromUserId }) => {
      console.log("[VIDEO CALL] *** RECEIVED SIGNAL ***");
      console.log("[VIDEO CALL] From user:", fromUserId);
      console.log("[VIDEO CALL] Signal type:", signalData.type || 'data');
      console.log("[VIDEO CALL] Current peer exists:", !!peer);
      console.log("[VIDEO CALL] Signal data:", signalData);
      
      if (peer) {
        try {
          peer.signal(signalData);
          console.log("[VIDEO CALL] Signal processed successfully");
        } catch (error) {
          console.error("[VIDEO CALL] Error processing signal:", error);
        }
      } else {
        console.warn("[VIDEO CALL] No peer available to process signal");
        console.log("[VIDEO CALL] Current call status:", callStatus);
        console.log("[VIDEO CALL] Current call room:", callRoom);
      }
    };

    const handleCallEnded = ({ reason }) => {
      console.log("[VIDEO CALL] Call ended:", reason || "");
      toast.success(reason || "Call ended");
      endCall();
    };

    socket.on("video-call-initiated", handleCallInitiated);
    socket.on("video-call-accepted", handleCallAccepted);
    socket.on("video-call-rejected", handleCallRejected);
    socket.on("video-call-signal", handleSignal);
    socket.on("video-call-ended", handleCallEnded);

    return () => {
      socket.off("video-call-initiated", handleCallInitiated);
      socket.off("video-call-accepted", handleCallAccepted);
      socket.off("video-call-rejected", handleCallRejected);
      socket.off("video-call-signal", handleSignal);
      socket.off("video-call-ended", handleCallEnded);
    };
  }, [socket, peer]);

  // Handle incoming video calls via window events
  useEffect(() => {
    const handleIncomingCall = (event) => {
      console.log("[VIDEO CALL] *** INCOMING CALL RECEIVED IN COMPONENT ***");
      console.log("[VIDEO CALL] Call data:", event.detail);
      console.log("[VIDEO CALL] Caller name:", event.detail?.caller?.name);
      console.log("[VIDEO CALL] Room ID:", event.detail?.roomId);
      setIncomingCall(event.detail);
    };

    console.log("[VIDEO CALL] Setting up incoming call listener");
    window.addEventListener('incoming-video-call', handleIncomingCall);
    
    return () => {
      console.log("[VIDEO CALL] Removing incoming call listener");
      window.removeEventListener('incoming-video-call', handleIncomingCall);
    };
  }, [setIncomingCall]);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("[VIDEO CALL] Setting local video stream:", localStream.id);
      localVideoRef.current.srcObject = localStream;
      // Force video to play
      localVideoRef.current.play().catch(console.error);
    }
  }, [localStream]);

  // Additional effect to ensure local video is always assigned
  useEffect(() => {
    if (isCallActive && localVideoRef.current) {
      const currentStream = localStream || useVideoCallStore.getState().localStream;
      if (currentStream && !localVideoRef.current.srcObject) {
        console.log("[VIDEO CALL] Force assigning local stream to video ref:", currentStream.id);
        localVideoRef.current.srcObject = currentStream;
        localVideoRef.current.play().catch(console.error);
      }
    }
  }, [isCallActive, localVideoRef.current]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("[VIDEO CALL] Setting remote video stream:", remoteStream.id);
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Note: Removed the problematic useEffect that was causing infinite loop
  // The localStream is already coming directly from the store, so no manual sync needed

  // Debug helper - expose to window for debugging
  useEffect(() => {
    window.debugVideoCall = () => {
      const { authUser, onlineUsers: storeOnlineUsers, socket: storeSocket } = useAuthStore.getState();
      const { selectedUser } = useChatStore.getState();
      console.log("=== VIDEO CALL DEBUG ===");
      console.log("Current user:", authUser?._id, authUser?.fullName);
      console.log("Selected user:", selectedUser?._id, selectedUser?.fullName);
      console.log("Socket connected:", !!storeSocket?.connected);
      console.log("Socket ID:", storeSocket?.id);
      console.log("Online users:", storeOnlineUsers);
      console.log("Socket object:", storeSocket);
      console.log("=======================");
    };
  }, []);

  const initializeMedia = async () => {
    try {
      console.log("[VIDEO CALL] Requesting media access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log("[VIDEO CALL] Media access granted, setting local stream...");
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("[VIDEO CALL] Error accessing media:", error);
      
      // Specific error messages for better UX
      if (error.name === 'NotAllowedError') {
        toast.error("Camera/microphone access denied. Please allow permissions and try again.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No camera/microphone found on this device.");
      } else if (error.name === 'NotSupportedError') {
        toast.error("Camera/microphone not supported on this browser.");
      } else {
        toast.error("Could not access camera/microphone: " + error.message);
      }
      
      endCall();
      throw error;
    }
  };

  const initiatePeerConnection = (isInitiator, stream = null, roomId = null, targetUserId = null) => {
    const currentStream = stream || localStream || useVideoCallStore.getState().localStream;
    const currentRoom = roomId || callRoom;
    const currentTargetId = targetUserId || useVideoCallStore.getState().targetUserId || (incomingCall ? incomingCall?.caller?._id : null);
    
    console.log("[VIDEO CALL] *** CREATING PEER CONNECTION ***");
    console.log("[VIDEO CALL] Room ID:", currentRoom);
    console.log("[VIDEO CALL] Target User ID:", currentTargetId);
    console.log("[VIDEO CALL] Is Initiator:", isInitiator);
    
    if (!currentStream) {
      console.error("[VIDEO CALL] No local stream available");
      console.log("[VIDEO CALL] Debug - localStream:", localStream);
      console.log("[VIDEO CALL] Debug - store stream:", useVideoCallStore.getState().localStream);
      return;
    }
    
    if (!currentRoom) {
      console.error("[VIDEO CALL] No room ID available");
      return;
    }
    
    if (!currentTargetId) {
      console.error("[VIDEO CALL] No target user ID available");
      return;
    }
    
    console.log("[VIDEO CALL] Using stream for peer connection:", currentStream.id);

    const newPeer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: currentStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Free TURN servers for cross-device connectivity
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject', 
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10
      }
    });

    newPeer.on('signal', (signalData) => {
      console.log("[VIDEO CALL] Sending signal:", signalData.type || 'data', "Room:", currentRoom);
      console.log("[VIDEO CALL] Target user ID:", currentTargetId);
      console.log("[VIDEO CALL] Emitting signal to socket for room:", currentRoom);
      socket.emit('video-call-signal', {
        roomId: currentRoom,
        signalData,
        targetUserId: currentTargetId
      });
    });

    newPeer.on('stream', (stream) => {
      console.log("[VIDEO CALL] Received remote stream:", stream.id);
      setRemoteStream(stream);
      setCallStatus('connected');
    });

    newPeer.on('connect', () => {
      console.log("[VIDEO CALL] Peer connected successfully");
      setCallStatus('connected');
    });

    newPeer.on('data', (data) => {
      console.log("[VIDEO CALL] Received data:", data);
    });

    // Add ICE candidate debugging
    newPeer.on('iceStateChange', (iceConnectionState) => {
      console.log("[VIDEO CALL] ICE state changed:", iceConnectionState);
    });

    newPeer.on('iceCandidate', (candidate) => {
      console.log("[VIDEO CALL] ICE candidate:", candidate);
    });

    newPeer.on('error', (error) => {
      console.error("[VIDEO CALL] Peer error:", error);
      toast.error(`Connection failed: ${error.message}`);
      endCall();
    });

    newPeer.on('close', () => {
      console.log("[VIDEO CALL] Peer connection closed");
      setCallStatus('ended');
    });

    // Debug connection state
    const checkConnectionState = () => {
      if (newPeer._pc) {
        console.log("[VIDEO CALL] Connection state:", newPeer._pc.connectionState);
        console.log("[VIDEO CALL] ICE connection state:", newPeer._pc.iceConnectionState);
        console.log("[VIDEO CALL] ICE gathering state:", newPeer._pc.iceGatheringState);
      }
    };

    const stateInterval = setInterval(checkConnectionState, 2000);
    
    newPeer.on('close', () => {
      clearInterval(stateInterval);
    });

    // Set timeout for connection
    setTimeout(() => {
      if (callStatus === 'calling' || callStatus === 'ringing') {
        console.warn("[VIDEO CALL] Connection timeout after 60 seconds");
        toast.error("Connection timeout. Please try again.");
        endCall();
      }
    }, 60000); // 60 second timeout

    setPeer(newPeer);
  };

  const handleAcceptCall = async () => {
    try {
      console.log("[VIDEO CALL] Accepting call and initializing media...");
      console.log("[VIDEO CALL] Incoming call data:", incomingCall);
      
      let stream = localStream;
      
      // Initialize media first before accepting call
      if (!stream) {
        console.log("[VIDEO CALL] No local stream, requesting media access...");
        stream = await initializeMedia();
      }
      
      // Accept the call
      acceptCall(incomingCall.roomId);
      
      if (stream) {
        console.log("[VIDEO CALL] Local stream ready, creating peer connection...");
        console.log("[VIDEO CALL] Using room ID for receiver:", incomingCall.roomId);
        console.log("[VIDEO CALL] Incoming call caller object:", incomingCall.caller);
        console.log("[VIDEO CALL] Target caller ID from _id:", incomingCall.caller._id);
        console.log("[VIDEO CALL] Target caller ID from id:", incomingCall.caller.id);
        const callerId = incomingCall.caller._id || incomingCall.caller.id;
        console.log("[VIDEO CALL] Final caller ID to use:", callerId);
        // Small delay to ensure call is accepted on server side
        setTimeout(() => {
          initiatePeerConnection(false, stream, incomingCall.roomId, callerId); // Receiver doesn't initiate
        }, 500);
      } else {
        console.error("[VIDEO CALL] Failed to get media stream");
        toast.error("Failed to initialize media stream");
        rejectCall(incomingCall.roomId);
      }
      
    } catch (error) {
      console.error("[VIDEO CALL] Error accepting call:", error);
      toast.error("Failed to access camera/microphone");
      rejectCall(incomingCall.roomId);
    }
  };

  const handleRejectCall = () => {
    rejectCall(incomingCall.roomId);
  };

  // Incoming call modal
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="minecraft-border bg-gray-300 p-6 sm:p-8 rounded-lg max-w-sm sm:max-w-md w-full relative">
          <style>
            {`
              .minecraft-border {
                border: 4px solid #555555;
                box-shadow: 4px 4px 0 #00000050;
                background-image: url('https://minecraft.wiki/images/Stone_(texture)_JE5_BE3.png');
                background-repeat: repeat;
                image-rendering: pixelated;
              }
              .pixel-font {
                font-family: 'VT323', monospace;
              }
              .call-avatar {
                width: 80px;
                height: 80px;
                min-width: 80px;
                min-height: 80px;
              }
              @media (max-width: 480px) {
                .call-avatar {
                  width: 60px;
                  height: 60px;
                  min-width: 60px;
                  min-height: 60px;
                }
                .call-title {
                  font-size: 1.5rem !important;
                }
                .call-name {
                  font-size: 1.25rem !important;
                }
              }
            `}
          </style>
          
          <div className="text-center">
            <div className="mb-6">
              <img
                src={incomingCall.caller.profilePic || "/avatar.png"}
                alt={incomingCall.caller.name}
                className="call-avatar rounded-full mx-auto mb-4 border-2 border-gray-600 object-cover"
                style={{ imageRendering: "pixelated" }}
              />
              <h3 className="call-title pixel-font text-2xl sm:text-3xl text-gray-800 mb-2 font-bold">
                Incoming Video Call
              </h3>
              <p className="call-name pixel-font text-xl sm:text-2xl text-gray-600 truncate">
                {incomingCall.caller.name}
              </p>
            </div>
            
            <div className="flex gap-6 justify-center">
              <button
                onClick={handleAcceptCall}
                className="bg-green-500 hover:bg-green-600 text-white p-4 sm:p-5 rounded-full transition-all transform hover:scale-105 minecraft-border shadow-lg"
                title="Accept Call"
              >
                <Phone size={28} />
              </button>
              <button
                onClick={handleRejectCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 sm:p-5 rounded-full transition-all transform hover:scale-105 minecraft-border shadow-lg"
                title="Reject Call"
              >
                <PhoneOff size={28} />
              </button>
            </div>
          </div>

          {/* Animated ripple effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-40 h-40 border-4 border-white/30 rounded-full animate-ping"></div>
              <div className="w-48 h-48 border-4 border-white/20 rounded-full animate-ping-slow absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Video call interface
  if (isCallActive) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <style>
          {`
            .minecraft-border {
              border: 4px solid #555555;
              box-shadow: 4px 4px 0 #00000050;
            }
            .pixel-font {
              font-family: 'VT323', monospace;
            }
          `}
        </style>

        {/* Header */}
        <div className="bg-gray-800 p-3 sm:p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <img
              src={selectedUser?.profilePic || "/avatar.png"}
              alt={selectedUser?.fullName}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gray-600 flex-shrink-0 object-cover"
              style={{ imageRendering: "pixelated" }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="pixel-font text-white text-lg sm:text-xl truncate">
                {selectedUser?.fullName}
              </h3>
              <p className="pixel-font text-gray-300 text-sm sm:text-lg">
                {callStatus === 'calling' ? 'Calling...' : 
                 callStatus === 'connected' ? 'Connected' : 
                 callStatus === 'ringing' ? 'Ringing...' : callStatus}
              </p>
            </div>
          </div>
          
          <button
            onClick={endCall}
            className="text-gray-300 hover:text-white p-2 transition-colors flex-shrink-0"
            title="Minimize Call"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Remote Video (main) */}
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="max-w-full max-h-full object-contain"
                style={{ aspectRatio: '16/9' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video size={48} className="text-gray-400" />
                  </div>
                  <p className="pixel-font text-white text-xl">
                    {callStatus === 'calling' ? 'Waiting for answer...' : 'Connecting...'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Local Video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 sm:w-60 sm:h-44 minecraft-border rounded-lg overflow-hidden bg-gray-800 md:top-2 md:right-2 md:w-32 md:h-24">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              style={{ aspectRatio: '4/3' }}
            />
            {isVideoOff && (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <VideoOff size={24} className="text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 sm:p-6">
          <div className="flex justify-center gap-4 sm:gap-6 max-w-md mx-auto">
            <button
              onClick={toggleMute}
              className={`p-3 sm:p-4 rounded-full transition-all transform hover:scale-105 minecraft-border shadow-lg ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={20} className="sm:w-6 sm:h-6" /> : <Mic size={20} className="sm:w-6 sm:h-6" />}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-3 sm:p-4 rounded-full transition-all transform hover:scale-105 minecraft-border shadow-lg ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
              title={isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
            >
              {isVideoOff ? <VideoOff size={20} className="sm:w-6 sm:h-6" /> : <Video size={20} className="sm:w-6 sm:h-6" />}
            </button>
            
            <button
              onClick={endCall}
              className="bg-red-500 hover:bg-red-600 text-white p-3 sm:p-4 rounded-full transition-all transform hover:scale-105 minecraft-border shadow-lg"
              title="End Call"
            >
              <PhoneOff size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VideoCall; 