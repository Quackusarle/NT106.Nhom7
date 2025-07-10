import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; /*File user has selected*/
    if (!file) return; /* No file selected */

    const reader = new FileReader();

    reader.readAsDataURL(file); /* Allow to read as image as URL */

    /* Convert image into Base64 format */
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image); /* user select an image from device */

      /* This function update the uploaded image to database! */
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <>
      {/* Custom Minecraft-like font and styles */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
          .pixel-font {
            font-family: 'VT323', monospace;
          }
          .minecraft-bg {
            background-color: #d4c8a8;
            border: 4px solid #8b8b8b;
            box-shadow: inset 0 0 0 1px #00000030;
          }
          .minecraft-border {
            border: 4px solid #555555;
            box-shadow: 4px 4px 0 #00000050;
          }
          .minecraft-btn {
            background-color: #a0a0a0;
            border: 2px solid #555555;
            color: #ffffff;
            text-shadow: 1px 1px 0 #00000050;
            transition: background-color 0.2s, transform 0.1s;
          }
          .minecraft-btn:hover {
            background-color: #b0b0b0;
            transform: translateY(-1px);
          }
          .minecraft-btn:active {
            background-color: #909090;
            transform: translateY(0);
          }
          .minecraft-btn:disabled {
            background-color: #707070;
            cursor: not-allowed;
          }
        `}
      </style>

      /* Top information for "Profile" and "Your profile information" */
      <div className="min-h-screen pt-20 bg-[url('https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png')] bg-repeat">
        <div className="max-w-2xl mx-auto p-4 py-8">
          <div className="bg-gray-300/90 rounded-lg minecraft-border p-6 space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold pixel-font text-gray-800">Profile</h1>
              <p className="text-lg text-gray-700 pixel-font mt-2">Your profile information</p>
            </div>

            {/* avatar upload section */}

            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img
                  /* 
                     Display user's updated image, or default image "/avatar.png", or 
                     already selected image for the next time login
                  */
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-32 rounded-lg object-cover minecraft-border"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`
                    absolute bottom-0 right-0 
                    bg-gray-800 hover:bg-gray-700 hover:scale-105
                    p-2 rounded-full cursor-pointer 
                    transition-all duration-200
                    ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                  `}
                >
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
              <p className="text-lg text-gray-700 pixel-font">
                {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="text-lg text-gray-700 pixel-font flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-800" />
                  Full Name
                </div>
                <p className="px-4 py-2.5 minecraft-bg rounded-lg minecraft-border">{authUser?.fullName}</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-lg text-gray-700 pixel-font flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-800" />
                  Email Address
                </div>
                <p className="px-4 py-2.5 minecraft-bg rounded-lg minecraft-border">{authUser?.email}</p>
              </div>
            </div>

            <div className="mt-6 bg-gray-300/90 rounded-lg minecraft-border p-6">
              <h2 className="text-2xl font-medium pixel-font text-gray-800 mb-4">Account Information</h2>
              <div className="space-y-3 text-lg pixel-font">
                <div className="flex items-center justify-between py-2 border-b-2 border-gray-600">
                  <span>Member Since</span>
                  <span>{authUser.createdAt?.split("T")[0]}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Account Status</span>
                  <span className="text-green-700">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default ProfilePage;