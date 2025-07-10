import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UserPlus, Bell } from "lucide-react";
import toast from "react-hot-toast";

const Sidebar = () => {
  // ✅ Import đầy đủ các function cần thiết
  const { 
    getUsers, 
    users, 
    selectedUser, 
    setSelectedUser, 
    isUsersLoading,
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend
  } = useChatStore();
  
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Modal state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // ✅ Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ✅ Handle send friend request với validation đầy đủ
  const handleSendFriendRequest = async () => {
    if (!addEmail.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }

    if (!isValidEmail(addEmail.trim())) {
      toast.error("Email không hợp lệ");
      return;
    }

    // Kiểm tra không gửi cho chính mình
    if (addEmail.trim().toLowerCase() === authUser?.email?.toLowerCase()) {
      toast.error("Không thể gửi lời mời kết bạn cho chính mình");
      return;
    }

    // Kiểm tra đã là bạn bè chưa
    const isAlreadyFriend = users.some(user => 
      user.email?.toLowerCase() === addEmail.trim().toLowerCase()
    );
    
    if (isAlreadyFriend) {
      toast.error("Người này đã là bạn bè của bạn");
      return;
    }

    setIsSendingRequest(true);
    try {
      await sendFriendRequest(addEmail.trim());
      setAddEmail("");
      setShowAddFriend(false);
    } catch (error) {
      console.error("Error sending friend request:", error);
      // Error đã được handle trong useChatStore
    } finally {
      setIsSendingRequest(false);
    }
  };

  // ✅ Fetch friend requests với proper error handling
  const fetchRequests = async () => {
    if (showRequests) {
      setShowRequests(false);
      return;
    }
    
    setIsLoadingRequests(true);
    try {
      await getFriendRequests();
      // Lấy từ store sau khi fetch
      const requests = useChatStore.getState().friendRequests || [];
      setFriendRequests(requests);
      setShowRequests(true);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Không thể tải danh sách lời mời");
      setFriendRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // ✅ Handle accept friend request
  const handleAcceptRequest = async (userId) => {
    try {
      await acceptFriendRequest(userId);
      // Refresh requests list
      setFriendRequests(prev => prev.filter(fr => fr._id !== userId));
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  // ✅ Handle decline friend request
  const handleDeclineRequest = async (userId) => {
    try {
      await declineFriendRequest(userId);
      // Refresh requests list
      setFriendRequests(prev => prev.filter(fr => fr._id !== userId));
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  // ✅ Handle remove friend
  const handleRemoveFriend = async (user) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${user.fullName} khỏi danh sách bạn bè?`)) {
      try {
        await removeFriend(user._id);
        // Nếu đang chat với user vừa xóa thì bỏ chọn
        if (selectedUser?._id === user._id) {
          setSelectedUser(null);
        }
      } catch (error) {
        console.error("Error removing friend:", error);
      }
    }
  };

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-gray-600 flex flex-col transition-all duration-200 bg-gray-300/90">
      <style>
        {`
          .hover-scale:hover { transform: scale(1.02); transition: transform 0.2s ease; }
        `}
      </style>
      
      <div className="border-b border-gray-600 w-full p-6 relative">
        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Users className="size-8 text-gray-800 drop-shadow-[2px_2px_1px_#00000080]" />
            <span className="font-medium pixel-font text-gray-800 text-3xl">Bạn bè</span>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              title="Kết bạn mới"
              onClick={() => setShowAddFriend(true)}
            >
              <UserPlus size={16} />
            </button>
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center relative transition-colors"
              title="Lời mời kết bạn"
              onClick={fetchRequests}
              disabled={isLoadingRequests}
            >
              <Bell size={16} />
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-4 hidden lg:flex items-center gap-3">
          <label className="cursor-pointer flex items-center gap-3">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="w-6 h-6 rounded border-gray-600 bg-gray-500 shadow-[inset_0_0_0_1px_#00000030]"
            />
            <span className="pixel-font text-gray-800 text-xl drop-shadow-[1px_1px_1px_#00000080]">
              Show online only
            </span>
          </label>
          <span className="pixel-font text-gray-800 text-lg drop-shadow-[1px_1px_1px_#00000080]">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-4 flex-1">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className={`w-full p-4 flex items-center gap-4 transition-colors hover-scale ${
              selectedUser?._id === user._id 
                ? "bg-gray-500/20 ring-2 ring-gray-800/50" 
                : "hover:bg-gray-500/10"
            }`}
          >
            <button
              onClick={() => setSelectedUser(user)}
              className="flex items-center gap-4 flex-1 text-left"
              style={{ outline: "none", background: "none", border: "none", padding: 0 }}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-10 object-cover rounded border-2 border-gray-600 shadow-[2px_2px_0_#00000080]"
                  style={{ imageRendering: "pixelated" }}
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-4 bg-green-600 rounded-full ring-2 ring-gray-500 shadow-[1px_1px_0_#00000080]" />
                )}
                {user.unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-600 text-white text-xs flex items-center justify-center rounded-full z-10 font-bold px-1" style={{ fontFamily: "monospace" }}>
                    {user.unreadCount}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="font-medium truncate pixel-font text-gray-800 text-2xl drop-shadow-[1px_1px_1px_#00000080]">
                  {user.fullName}
                </div>
                <div className="pixel-font text-gray-800 text-xl drop-shadow-[1px_1px_1px_#00000080]">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
            {/* Nút xóa bạn */}
            <button
              className="ml-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
              title="Xóa bạn bè"
              onClick={() => handleRemoveFriend(user)}
            >
              <span style={{ fontSize: 18, fontWeight: "bold" }}>✕</span>
            </button>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center pixel-font text-gray-800 text-2xl py-6 drop-shadow-[1px_1px_1px_#00000080]">
            Không có bạn bè nào
          </div>
        )}
      </div>

      {/* Modal kết bạn */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Kết bạn mới</h3>
            <input
              type="email"
              placeholder="Nhập email bạn muốn kết bạn"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              className="border p-2 rounded"
            />
            <div className="flex gap-2 justify-end">
              <button
                className="bg-gray-300 px-3 py-1 rounded"
                onClick={() => setShowAddFriend(false)}
              >Đóng</button>
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded"
                onClick={handleSendFriendRequest}
                disabled={isSendingRequest}
              >Gửi lời mời</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lời mời kết bạn */}
      {showRequests && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">Lời mời kết bạn</h3>
            {isLoadingRequests ? (
              <div>Loading...</div>
            ) : friendRequests.length === 0 ? (
              <div>Không có lời mời nào.</div>
            ) : (
              friendRequests.map(fr => (
                <div key={fr._id} className="flex items-center gap-3 border-b py-2">
                  <img src={fr.profilePic || "/avatar.png"} alt="avatar" className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="font-semibold">{fr.fullName}</div>
                    <div className="text-xs text-gray-500">{fr.email}</div>
                  </div>
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded mr-1"
                    onClick={() => handleAcceptRequest(fr._id)}
                  >Đồng ý</button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => handleDeclineRequest(fr._id)}
                  >Từ chối</button>
                </div>
              ))
            )}
            <div className="flex justify-end mt-2">
              <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => setShowRequests(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;