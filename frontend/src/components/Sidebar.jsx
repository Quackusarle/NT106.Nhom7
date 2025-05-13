import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

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
      <div
        className="border-b border-gray-600 w-full p-6 relative"
      >
        <div className="flex items-center gap-4">
          <Users className="size-8 text-gray-800 drop-shadow-[2px_2px_1px_#00000080]" />
          <span className="font-medium pixel-font text-gray-800 text-3xl">
            Contacts
          </span>
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

      <div
        className="overflow-y-auto w-full py-4 flex-1"
      >
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-4 flex items-center gap-4 transition-colors hover-scale
              ${selectedUser?._id === user._id ? "bg-gray-500/20 ring-2 ring-gray-800/50" : "hover:bg-gray-500/10"}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                // image of users.
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-10 object-cover rounded border-2 border-gray-600 shadow-[2px_2px_0_#00000080]"
                style={{ imageRendering: "pixelated" }}
              />
              {onlineUsers.includes(user._id) && (
                <span
                  // Green circle to indicate online users.
                  className="absolute bottom-0 right-0 size-4 bg-green-600 
                  rounded-full ring-2 ring-gray-500 shadow-[1px_1px_0_#00000080]"
                />
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
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center pixel-font text-gray-800 text-2xl py-6 drop-shadow-[1px_1px_1px_#00000080]">
            No online users
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;