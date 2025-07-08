import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    
    encryptedContent: {
      type: String, 
    },
    
    encryptedKey: { 
        type: String, 
    },
    
    encryptedKeySender: { 
        type: String, 
    },
    
    iv: {
        type: String, 
    },
    
    read: {
        type: Boolean,
        default: false,
    },
    
    is_file: {
      type: Boolean,
      default: false,
    },
    original_file_name: {
      type: String,
      default: null,
    },
    file_type: {
        type: String,
        default: null,
    },
    file_size: {
        type: Number,
        default: null, 
    },
    file_path: { 
        type: String,
        default: null, 
    },
    file_iv: { type: String }, 
    file_encrypted_key: { type: String }, 
    file_encrypted_key_sender: { type: String }, 
    // Chunked file support
    chunked: { type: Boolean, default: false },
    fileId: { type: String, default: null },
    totalChunks: { type: Number, default: null },
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      emoji: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;