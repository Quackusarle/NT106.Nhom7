import cloudinary from "../lib/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUsersForSidebar = async (req, res) => {
    try{
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password");

        res.status(200).json(filteredUsers)
    }
    catch(error){
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
};

export const getMessages = async(req,res) => {
    try{
        const{ id: userToChatId} = req.params;
        const myId = req.user._id;
        
        const message = await Message.find({
            $or:[
                {senderIdId:myId, receiverId: userToChatId},
                {myId: userToChatId, receiverId: myId}
            ]
        }) 

        res.status(200).json(message);
    
    }
    catch(error){
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({error:"Internal server error"});
    }
}

export const sendMessage = async(req, res) => {
    try{
        const{ content, image}=req.body;
        const{id: receiverId} = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;

        }

        const newMessage = new Message({
            senderId,
            receiverId,
            content,
            image: imageUrl,
        });

        await newMessage.save();

        res.status(201).json(newMessage);
    }
    catch(error){
        console.log("Error im message controller: ", error.message);
        res.status(500).json({ error: "Internal server error"});
    }
}