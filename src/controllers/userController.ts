import { Request, Response } from "express";
import argon2 from "argon2"
import crypto from "crypto"
import {
    createUser,
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    updateUserPassword,
    deleteUser,
    saveRefreshToken,
    getRefreshToken,
    getRefreshTokenForLogout,
    getRefreshTokenBySessionId,
    deleteRefreshToken
} from "../models/usermodels";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
    
} from "../utils/token";
import {createSession,getActiveSession,getSessionById,closeSessionById,getUserLoginHistory} from "../models/sessionModels"
import {getDeviceInfo} from "../utils/deviceInfo"
import { selectUnknownFields } from "express-validator/lib/field-selection";
import { saveSessionToRedis,getSessionFromRedis,deleteSessionFronRedis,
        saveUserToRedis,getAllUsersFromRedis,getUserByIdFromRedis,deleteUserFromRedis,
        savePasswordResetToken,getPasswordRestToken,deletePasswordResetToken       
 } from "../models/redisModels";

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body
        if (!name || !email || !password || !role) {
            res.status(400).json({
                message: "All fields are required"
            })
        }
        const existingUser = await getUserByEmail(email)
        if (existingUser) {
            res.status(409).json({
                message: "user already exist"
            })
            return
        }
        const hashedPassword = await argon2.hash(password);
        const user = await createUser(name, email, hashedPassword, role)

        res.status(201).json({
            message: "user registered successfully",
            user
        })

    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })

    }
}

export const login = async (req: Request, res: Response):Promise<void> => {
    try {
        const { email, password } = req.body
        const user = await getUserByEmail(email)
        if (!user) {
            res.status(401).json({
                message: "Invalid email or password"
            })
            return
        }
        
        const passwordMatch = await argon2.verify(user.password, password)
        if (!passwordMatch) {
            res.status(401).json({
                message: "Inavalid password"
            })
            return
        }
        const activeSession=await getActiveSession(user.id)
        //if active session already exist
        if(activeSession){
            res.status(409).json({
                message:"User is already logged in ",
                forceLoginRequired:true,
                activeSession:{
                    id:activeSession.id,
                    deviceName:activeSession.device_name,
                    operatingSystem:activeSession.operating_system,
                    loginTimestamp:activeSession.login_timestamp
                }
            });
            return
        }
        
        
        const userAgent=req.headers["user-agent"] || "unknown" 
        const deviceIp=req.ip || "unknown"

        const deviceInfo=getDeviceInfo(userAgent,deviceIp)
        const session=await createSession(user.id,deviceInfo.deviceId,deviceInfo.operatingSystem,deviceInfo.deviceName,deviceIp)
        if (!session) {
            res.status(500).json({
                message: "Failed to create login session"
            });

            return;
        }

        const payload = {
            id: user.id,
            name:user.name,
            email: user.email,
            role: user.role,
            sessionId:session.id
        }
        const accessToken = generateAccessToken(payload)
        const refreshToken = generateRefreshToken(payload)


        const refreshExpiresAt = new Date()
        refreshExpiresAt.setDate(
            refreshExpiresAt.getDate() + 7
        )
        await saveRefreshToken(user.id,session.id, refreshToken, refreshExpiresAt)
        await saveSessionToRedis(session.id,user.id,session.expires_at)  
        await saveUserToRedis({
            id:user.id,
            name:user.name,
            email:user.email,
            role:user.role
        })      

        res.status(200).json({
            "status": "success",
            "success": true,
            "message": "Account details retrieved successfully.",
            "data": {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            session: {
                id: session.id,
                loginTimestamp:session.login_timestamp,
                expiresAt:session.expires_at,
                status:session.status

            }
        })


    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })

    }

}

export const forceLogin=async(req:Request,res:Response):Promise<void>=>{
    try{
        const {email,password}=req.body
        const user=await getUserByEmail(email)
        if(!user){
            res.status(401).json({
                message:"Invalid email or Password"
            })
            return
        }
        const passwordMatch=await argon2.verify(user.password,password)
        if(!passwordMatch){
            res.status(401).json({
                message:"Invalid password"
            })
            return
        }
        const activeSession=await getActiveSession(user.id)
        if(activeSession){
            await closeSessionById(activeSession.id)
            const oldRefreshToken=await getRefreshTokenBySessionId(activeSession.id)
            if(oldRefreshToken){
                await deleteRefreshToken(oldRefreshToken.token)
            }
        }
        const userAgent=req.headers["user-agent"] || "unknown"
        const deviceIp=req.ip || "unknown"
        const deviceInfo=await getDeviceInfo(userAgent,deviceIp)
        const newSession=await createSession(user.id,deviceInfo.deviceId,deviceInfo.operatingSystem,deviceInfo.deviceName,deviceIp)
        if (!newSession) {
            res.status(500).json({
                message: "Failed to create login session"
            });
            return;
        }
        const payLoad={
            id:user.id,
            name:user.name,
            email:user.email,
            role:user.role,
            sessionId:newSession.id
        }
        const newAccessToken=await generateAccessToken(payLoad);
        const newRefreshToken=await generateRefreshToken(payLoad)
        const refreshExpiresAt = new Date()
        refreshExpiresAt.setDate(
            refreshExpiresAt.getDate() + 7
        )
        await saveRefreshToken(user.id,newSession.id, newRefreshToken, refreshExpiresAt)
        await saveSessionToRedis(newSession.id,user.id,newSession.expires_at)
        await saveUserToRedis({id:user.id,name:user.name,email:user.email,role:user.role})
        res.status(200).json({
            "status": "success",
            "success": true,
            "message": "Account details retrieved successfully.",
            "data": {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            "accessToken": newAccessToken,
            "refreshToken": newRefreshToken,
            session: {
                id: newSession.id,
                loginTimestamp:newSession.login_timestamp,
                expiresAt:newSession.expires_at,
                status:newSession.status

            }
        })
       

        
    }
    catch(err){
        console.log(err)
        res.status(500).json({
            status:"failed",
            success:false,
            message:"something went wrong"
        })
    }
    
}
//REFRESH ACCESS TOKEN
export const refreshToken = async (req: Request, res: Response):Promise<void> => {
    try {
        const {refreshToken} = req.body//get from request body
        if (!refreshToken) {
            res.status(401).json({
                message: "Refresh Token required"
            })
            return
        }
        const decoded = verifyRefreshToken(refreshToken) 
        console.log("Decoded resfresh token",decoded)
        const storedToken=await getRefreshToken(refreshToken)
        console.log(storedToken)


        if(!storedToken){
            res.status(401).json({
                message:"Invalid or expired refresh Token"
            })
            return
        }

        if(storedToken.session_id!==decoded.sessionId){
            res.status(401).json({
                message:"Refresh token does not belong to this session"
            })
            return
        }
        //get old session
        //check in redis session
        const redisSession=await getSessionFromRedis(decoded.sessionId)
        if(!redisSession){
            res.status(401).json({
                message:"Session is no longer active"
            })
            return
        }
        const oldSession=await getSessionById(decoded.sessionId)
        if(!oldSession){
            res.status(401).json({
                message:"Session not found"
            })
            return
        }
        if(oldSession.status===0){
            res.status(401).json({
            message:"Session is already closed"
            })
            return
        }
        if(new Date(oldSession.expires_at) < new Date()){
            res.status(401).json({
                message:"session has expired please login again"
            })
            return 
         }


        const closedSession=await closeSessionById(oldSession.id)
        await deleteSessionFronRedis(oldSession.id)
        await deleteRefreshToken(refreshToken)
        const userAgent=req.headers["user-agent"] || "unknown"
        const deviceIp=req.ip || "unknown"
        const deviceInfo=getDeviceInfo(userAgent,deviceIp)
        //create new session
        const newSession=await createSession(decoded.id,deviceInfo.deviceId,deviceInfo.operatingSystem,deviceInfo.deviceName,deviceIp)
        //new payload
        const payload={
            id:decoded.id,
            name:decoded.name,
            email:decoded.email,
            role:decoded.role,
            sessionId:newSession.id
        }
        const newAccessToken=generateAccessToken(payload)
        const newRefreshToken=generateRefreshToken(payload)
        const refreshExpiresAt=new Date()
        refreshExpiresAt.setDate(refreshExpiresAt.getDate()+7)
        //save NEW refreshtoken
        await saveRefreshToken(decoded.id,newSession.id,newRefreshToken,refreshExpiresAt)
        await saveSessionToRedis(newSession.id,decoded.id,newSession.expires_at)

        
        res.status(200).json({
            "status": "success",
            "success": true,
            "message": "token refreshed successfully.",
            accessToken:newAccessToken,
            refreshToken:newRefreshToken,
            previousSession:{
                id:closedSession.id,
                logoutTimestamp:closedSession.logout_timestamp,
                status:closedSession.status
            },
            newSession:{
                id:newSession.id,
                loginTimeStamp:newSession.login_timestamp,
                expiresAt:newSession.expires_at,
                status:newSession.status
            }
            
        })
        
        
    }
    catch(err){
        console.log(err)
        res.status(401).json({
            message:"Invalid or expired refresh token"
        })
    }
   
}
export const logout=async(req:Request,res:Response):Promise<void>=>{
    try{
        const {refreshToken}=req.body//get from request body
        if(!refreshToken){
            res.status(400).json({
                message:"refresh token not found"
            })
            return
        }
         // We use a separate query here because
        // even an expired refresh token should allow
        // us to find the session and close it.
        const storedToken=await getRefreshTokenForLogout(refreshToken)
        if(!storedToken){
            res.status(404).json({
                message:"refresh token not found"
            })
            return
        }
        const closedSession=await closeSessionById(storedToken.session_id)
        await deleteSessionFronRedis(storedToken.session_id)
        if(refreshToken){
            await deleteRefreshToken(refreshToken)
        }
        
        res.status(200).json({
                "status": "success",  
                "success": true,  
                "message": "Logout successfull.",  
                session: {
                        id:closedSession?.id,
                        loginTimestamp:closedSession?.login_timestamp,
                        logoutTimestamp:closedSession?.logout_timestamp,
                        expiresAt:closedSession?.expires_at,
                        status:closedSession?.status
                    }
                
            })

    }
    catch(err){
        console.log(err)
        res.status(500).json({
            "status": "failed",  
            "success": false,  
            "message": "Something went wrong."
            })
    }
}
export const getUsers = async (req: Request, res: Response):Promise<void> => {
    try {
        //check in redis
        const redisUsers=await getAllUsersFromRedis()
        if(redisUsers){
            console.log("users fetched from redis")
            res.status(200).json(redisUsers)
            return
        }
        

        const result = await getAllUsers()
        for(const user of result){
            await saveUserToRedis(user)
        }
       
        res.status(200).json(result)
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })
    }
}
export const getUserByID = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId=Number(id)
        if(isNaN(userId)){
            res.status(400).json({
                message:"Invalid user ID"
            })
            return
        }
        const redisUser=await getUserByIdFromRedis(userId)
        if(redisUser){
            console.log("retrived user from redis")
            res.status(200).json(redisUser)
            return
        }

        const result = await getUserById(userId)
        if (!result) {
            res.status(404).json("user not found")
            return
        }
        await saveUserToRedis(result)

        res.status(200).json(result)
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })

    }
}

export const updateUserById = async (req: Request, res: Response):Promise<void>=> {
    try {
        const { id } = req.params
       
        const userId = Number(id)
        if (isNaN(userId)) {
            res.status(400).json("invalid user id");
            return;
        }
         const { name, email, password, role } = req.body
         if(!name || !email || !password || !role){
            res.status(400).json({
                message:"All field are required"
            })
            return 
         }
        const hashedPassword = await argon2.hash(password)
        
        const user = await updateUser(
            userId,
            name,
            email,
            hashedPassword,
            role
        )
        if (!user) {
            res.status(404).json("user not found")
            return
        }
        try {
            await saveUserToRedis(user);
            console.log("User cache updated in Redis");
        } 
        catch (redisError) {
            console.log("Redis cache update failed:", redisError);
        }

        res.status(200).json({
                "status": "success",  
                "success": true,  
                "message": "user updated successfully.",  
                "data": user
                    })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })
    }


}

export const deleteUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId=Number(id)
        if(isNaN(userId)){
            res.status(400).json({
                message:"Invalid user ID"
            })
            return
        }
        const result = await deleteUser(userId)

        if (result) {
            res.status(404).json("user not found");
            return;
        }
        await deleteUserFromRedis(result)


        res.status(200).json("user deleted successfully");
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })
    }
}

export const loginHistory=async(req:Request,res:Response):Promise<void>=>{
    try{
        const userId=Number(req.params.userId)
        if(isNaN(userId)){
            res.status(400).json({
                message:"Invalid use ID"
            })
            return
        }
        const history=await getUserLoginHistory(userId)
        res.status(200).json({
            message:"Login history fetched successfully",
            history
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({
            message:"something went wrong"
        })
    }
}

export const forgotPassword=async(req:Request,res:Response):Promise<void>=>{
    try{
        const {email}=req.body
        const user=await getUserByEmail(email)
        if(!user){
            res.status.json({
                message:"user not found"
            })
            return
        }
        //generate tmporary token
        const resetToken=crypto.randomBytes(32).toString("hex")
        //store ONLY temporary token in redis
        //TTL=15 minutes
        await savePasswordResetToken(user.id,resetToken)
        res.status(200).json({
            message:"password reset token generated",
            "resetToken": resetToken
        })

    }
    catch(err){
        console.log(err)
        res.status(500).json({
            message:"something went wrong"
        })
    }
}

export const resetPassword=async(req:Request,res:Response):Promise<void>=>{
    try{
        const {email,resetToken,newPassword} =req.body
        const user=await getUserByEmail(email)
        if(!user){
            res.status(400).json({
                message:"invalid reset request"
            })
            return
        }
        //get temporary token from redis
        const storedToken=await getPasswordRestToken(user.id)
        if(!storedToken){
            res.status(400).json({
                message:"reset token is invalid or expired"
            })
            return
        }
        if(storedToken!==resetToken){
            res.status(400).json({
                message:"invalid reset token"
            })
            return
        }
        const hashedPassword=await argon2.hash(newPassword)
        const updatedUser=await updateUserPassword(user.id,hashedPassword)
        if(!updateUser){
            res.status(404).json({
                message:"user not found"
            })
            return
        }
        await deletePasswordResetToken(user.id)
        await saveUserToRedis(updatedUser)

        res.status(200).json({
            message:"password reset successfully"
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({
            message:"something went wrong"
        })
    }

}

export const updatedPassword=async(req:Request,res:Response):Promise<void>=>{
    try{
        const userId=req.user?.id
        if(!userId){
            res.status(401).json({
                message:"unauthorized"
            })
            return
        }
        const {currentPassword,newPassword}=req.body
        const user=await getUserByEmail(req.user!.email)
        if(!user){
            res.status(404).json({
                message:"user not found"
            })
            return 
        }
        const passwordMatch=await argon2.verify(user.password,currentPassword)
        if(!passwordMatch){
            res.status(401).json({
                message:"current password is incorrect"
            })
            return 
        }
        const hashedPassword=await argon2.hash(newPassword)

        const updatedUser=await updateUserPassword(userId,hashedPassword)
        if(!updatedUser){
            res.status(404).json({
                message:"user not found"
            })
            return
        }
         // Redis only gets safe fields
        // No password is stored
        await saveUserToRedis(updatedUser)
        res.status(200).json({
            message:"Password updated successefully"
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({
            message:
                "Something went wrong."
        });
    }
}