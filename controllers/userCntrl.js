import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import jwt from "jsonwebtoken";


export const login = asyncHandler(async(req,res)=>{
    const {phone_number, priority} = req.body;

    try {
        if(!phone_number || !priority){
            return res.status(400).json({message:"phone_number or priority is missing."});
        }
        //find user in DB
        const user = await prisma.user.findFirst({
            where:{phone_number},
        })
        if(!user){
            return res.status(400).json({message:"Inavlid Credentials."});
        }

        //if user valid, then generate token
        const token = jwt.sign({user},process.env.JWTKEY,{ expiresIn: '12d'});
        res.json({ success: true, token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
})

export const signup =asyncHandler(async(req,res)=>{
    let {phone_number,priority}=req.body;
    // console.log(phone_number,priority)
    try {
        if(!phone_number || !priority){
            return res.status(400).json({message:"phone_number or priority is missing."});
        }

        //check user already exist
        const existingUser = await prisma.user.findFirst({
            where:{phone_number}
        })
        if(existingUser){
            return res.status(401).json({message:"User Already exist"});
        }
        priority = priority-1;
        const newUser = await prisma.user.create({
            data:{
                phone_number,
                priority
            }
        })
         // Generate token for the new user
         const token = jwt.sign({ user: newUser }, process.env.JWTKEY, { expiresIn: '12h' });

         return res.json({ success: true, token, newUser:newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
})