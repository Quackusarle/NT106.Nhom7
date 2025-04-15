import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
dotenv.config();

export const generateToken = (userID, res) => {
    const token = jwt.sign({userID}, process.env.JWT_SECRET, {expiresIn: '30d'});


    res.cookie("jwt", token, {
        maxAge: 30*24*60*60*1000,
        httpOnly: true,
        sameSite:"strict",
        secure: process.env.NODE_ENV !== 'development' 
    }); 

    return token;

}