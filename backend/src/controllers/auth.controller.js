import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

export const signup = async (req, res) => {
    const { username, email, password } = req.body;
    try{
        if (password.length <6)
            return res.status(400).json({message: "Password must be at least 6 characters long"});

        const user = await User.findOne({ email });

        if (user)
            return res.status(400).json({message: "Email already exists"});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        if (new User) {
            generateToken(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profilePicture: newUser.profilePicture,
            });
        }
        else{
            return res.status(400).json({message: "User creation failed"});
        }
    }
    catch(err){
        console.log(err);
        res.status(500).json({message: "Internal server error"});
    }
}
export const login = async (req, res) => {
    const { email, password } = req.body;
    try{
        const user = await User.findOne({ email });

        if (!user)
            return res.status(400).json({message: "Invalid credentials"});

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect)
            return res.status(400).json({message: "Invalid credentials"});
        
        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
        });
    }
    catch(err){
        console.log(err);
        res.status(500).json({message: "Internal server error"});
    }

}
export const logout = async(req, res) => {
    try{
        res.clearCookie('jwt', {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV !== 'development',
        });
        res.status(200).json({message: "Logged out successfully"}); 
    }
    catch(err){
        console.log(err);
        res.status(500).json({message: "Internal server error"});
    }
}