import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";


export const verifyToken = asyncHandler(async(req,res,next)=>{
    let token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message:"Unauthorized"});
    }
    
    try {
        token = token.split(" ")[1];
        //verify
        jwt.verify(token,process.env.JWTKEY,(err,valid)=>{
            if(err){
                res.status(403).json("Token is not Valid");
            }
            else{
                //assign request to my user
                req.user = valid
                next();
            }
        })
    } catch (error) {
        res.status(403).json("You are not authorized");
    }
})