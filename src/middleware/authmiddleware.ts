import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token";
import { getSessionById } from "../models/sessionModels";
import {getSessionFromRedis} from "../models/redisModels"

export const verifyToken =async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
        const authorization = req.headers.authorization;
        if (!authorization) {
            res.status(401).json({
                message: "Access token required"
            });

            return;
        }
        const parts = authorization.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {

            res.status(401).json({
                message: "Invalid authorization format"
            })
            return;
        }
        const token = parts[1];
        const decoded = verifyAccessToken(token);
        console.log(decoded);

        const redisSession=await getSessionFromRedis(decoded.sessionId)
        if(!redisSession){
            res.status(401).json({
                message:"session is not active"
            })
            return
        }
        
        const session=await getSessionById(decoded.sessionId)
        if(!session){
            console.log("session missing in database",decoded.sessionId)
            res.status(401).json({
                message:"Session not found"
            })
            return 
        }
        if(session.status===0){
            res.status(401).json({
                message:"Session has been logged out"
            })
            return
        }
        if(new Date(session.expires_at)<=new Date()){
            res.status(401).json({
                message:"Session has expired"
            })
            return
        }

        req.user=decoded
        next();
    }
    catch (error) {

        console.log("Authentication error",error);

        res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};