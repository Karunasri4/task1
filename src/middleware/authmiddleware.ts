import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token";
import { getSessionById } from "../models/sessionModels";


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
        const session=await getSessionById(decoded.sessionId)
        if(!session){
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
        req.user=decoded
        next();
    }
    catch (error) {

        console.log(error);

        res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};