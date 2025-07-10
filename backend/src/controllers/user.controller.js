// Xóa bạn bè
export const removeFriend = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    if (myId.toString() === userId.toString()) return res.status(400).json({ message: "Cannot unfriend yourself" });
    const me = await User.findById(myId);
    const friend = await User.findById(userId);
    if (!me || !friend) return res.status(404).json({ message: "User not found" });
    // Remove each other from friends
    me.friends = me.friends.filter(id => id.toString() !== userId);
    friend.friends = friend.friends.filter(id => id.toString() !== myId.toString());
    await me.save();
    await friend.save();
    // Emit socket event to both users for realtime update
    const mySocketId = getReceiverSocketId(myId.toString());
    const friendSocketId = getReceiverSocketId(userId.toString());
    // Để frontend xử lý đúng, chỉ emit userId dạng string, không object
    if (mySocketId) io.to(mySocketId).emit("friendRemoved", userId.toString());
    if (friendSocketId) io.to(friendSocketId).emit("friendRemoved", myId.toString());
    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
import User from "../models/user.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// Gửi lời mời kết bạn
export const sendFriendRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const myId = req.user._id;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const friend = await User.findOne({ email });
    if (!friend) return res.status(404).json({ message: "User not found" });
    if (friend._id.equals(myId)) return res.status(400).json({ message: "Cannot add yourself" });
    const me = await User.findById(myId);
    if (me.friends.includes(friend._id)) return res.status(400).json({ message: "Already friends" });
    if (me.sentRequests.includes(friend._id)) return res.status(400).json({ message: "Request already sent" });
    if (me.friendRequests.includes(friend._id)) return res.status(400).json({ message: "User already sent you a request" });
    me.sentRequests.push(friend._id);
    friend.friendRequests.push(myId);
    await me.save();
    await friend.save();
    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách lời mời kết bạn
export const getFriendRequests = async (req, res) => {
  try {
    const myId = req.user._id;
    const me = await User.findById(myId).populate("friendRequests", "fullName email profilePic");
    res.json(me.friendRequests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Đồng ý kết bạn
export const acceptFriendRequest = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.body;
    const me = await User.findById(myId);
    const friend = await User.findById(userId);
    if (!me.friendRequests.includes(userId)) return res.status(400).json({ message: "No such request" });
    me.friendRequests = me.friendRequests.filter(id => id.toString() !== userId);
    me.friends.push(userId);
    friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== myId.toString());
    friend.friends.push(myId);
    await me.save();
    await friend.save();

    // Lấy thông tin user mới để gửi về cho từng phía
    const meInfo = await User.findById(myId).select("_id fullName email profilePic publicKey");
    const friendInfo = await User.findById(userId).select("_id fullName email profilePic publicKey");

    // Emit socket event cho cả hai phía, gửi info user vừa được thêm vào friends
    const mySocketId = getReceiverSocketId(myId.toString());
    const friendSocketId = getReceiverSocketId(userId.toString());
    if (mySocketId) io.to(mySocketId).emit("friendAccepted", { user: friendInfo });
    if (friendSocketId) io.to(friendSocketId).emit("friendAccepted", { user: meInfo });

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Từ chối lời mời
export const declineFriendRequest = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.body;
    const me = await User.findById(myId);
    const friend = await User.findById(userId);
    if (!me.friendRequests.includes(userId)) return res.status(400).json({ message: "No such request" });
    me.friendRequests = me.friendRequests.filter(id => id.toString() !== userId);
    friend.sentRequests = friend.sentRequests.filter(id => id.toString() !== myId.toString());
    await me.save();
    await friend.save();
    res.json({ message: "Friend request declined" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách bạn bè
export const getFriends = async (req, res) => {
  try {
    const myId = req.user._id;
    // Trả về cả publicKey để frontend không phải gọi lại nhiều lần
    const me = await User.findById(myId).populate("friends", "fullName email profilePic publicKey");
    res.json(me.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
