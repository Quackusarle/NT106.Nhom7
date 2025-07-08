import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  
  const { fullName, email, password, publicKey } = req.body;
  try {
    if (!fullName || !email || !password) { 
      return res.status(400).json({ message: "Full name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      publicKey: publicKey || "", 
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        publicKey: newUser.publicKey, 
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      publicKey: user.publicKey, 
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    
    const { profilePic, publicKey } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (profilePic) {
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        updateData.profilePic = uploadResponse.secure_url;
    }
    

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No update data provided (only profilePic allowed here)" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password"); 

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    
    const user = req.user.toObject(); 
    delete user.password; 
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getPublicKey = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select("publicKey"); 

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.publicKey) {
            return res.status(404).json({ message: "Public key not found for this user" });
        }

        res.status(200).json({ publicKey: user.publicKey });
    } catch (error) {
        console.log("Error in getPublicKey controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const updatePublicKey = async (req, res) => {
    try {
        const { publicKey } = req.body;
        const userId = req.user._id; 

        if (!publicKey || typeof publicKey !== 'string') {
            return res.status(400).json({ message: "Public key is required and must be a string." });
        }

        
        if (!publicKey.startsWith('-----BEGIN PUBLIC KEY-----') || !publicKey.endsWith('-----END PUBLIC KEY-----')) {
             return res.status(400).json({ message: "Invalid public key format." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { publicKey: publicKey },
            { new: true } 
        ).select("-password -email -fullName -profilePic"); 

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found while updating public key." });
        }

        console.log(`Public key updated for user ${userId}`);
        // Don't need to return the full user, just confirmation
        res.status(200).json({ message: "Public key updated successfully." });

    } catch (error) {
        console.error("Error in updatePublicKey controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
