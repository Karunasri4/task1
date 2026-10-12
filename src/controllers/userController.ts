import { Request, Response } from "express";
import { addEmailJob } from "../queues/emailQueue";
import argon2 from "argon2";
import crypto from "crypto";
import {
    createUser,
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    updateUserPassword,
    deleteUser
} from "../models/usermodels";
import {
    saveRefreshToken,
    getRefreshToken,
    getRefreshTokenForLogout,
    getRefreshTokenBySessionId,
    deleteRefreshToken
} from "../models/refreshTokenModels"
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} from "../utils/token";
import {createSession,getActiveSession,getSessionById,closeSessionById,getUserLoginHistory} from "../models/sessionModels"
import {getDeviceInfo} from "../utils/deviceInfo"
import { saveSessionToRedis,getSessionFromRedis,deleteSessionFronRedis,
        saveUserToRedis,getAllUsersFromRedis,getUserByIdFromRedis,deleteUserFromRedis,
        savePasswordResetToken,getPasswordRestToken,deletePasswordResetToken,
        hashEmailToken,saveEmailVerificationToken,getEmailVerificationUserId,deleteEmailVerificationToken
} from "../models/redisModels";
import { markEmailVerified } from "../models/usermodels";

const normalizeEmail = (email: unknown): string =>
    typeof email === "string" ? email.trim().toLowerCase() : "";

const emailVerificationUrl = (token: string): string => {
    const baseUrl = process.env.EMAIL_VERIFICATION_URL;
    if (!baseUrl) throw new Error("EMAIL_VERIFICATION_URL is not configured");
    return `${baseUrl}?token=${encodeURIComponent(token)}`;
};

const queueVerificationEmail = async (
    user: { id: number; name: string; email: string }
): Promise<void> => {
    const token = crypto.randomBytes(32).toString("hex");
    await saveEmailVerificationToken(hashEmailToken(token), user.id);
    await addEmailJob({
        type: "verify-email",
        to: user.email,
        name: user.name,
        url: emailVerificationUrl(token)
    });
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, password, role } = req.body
        const email=normalizeEmail(req.body.email)
        if (!name || !email || !password || !role) {
            res.status(400).json({
                message: "All fields are required"
            })
            return
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
        await queueVerificationEmail(user);
        res.status(201).json({
            message: "Registration successful. Check your email to verify your account.",
            user
        });
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
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.query.token;
        if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
            res.status(400).json({ message: "Invalid verification token" });
            return;
        }

        const tokenHash = hashEmailToken(token);
        const userId = await getEmailVerificationUserId(tokenHash);

        if (!userId) {
            res.status(400).json({ message: "Verification token is invalid or expired" });
            return;
        }

        const verified = await markEmailVerified(userId);
        if (!verified) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        await deleteEmailVerificationToken(tokenHash);
        res.status(200).json({
             message: "Email verified successfully. You can now log in."
        });
    } 
    catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({ 
            message: "Email verification failed" 
        });
    }
};


const checkCredentials = async (email: string, password: string) => {
    const user = await getUserByEmail(email);
    if (!user) return { user: null, error: "invalid" as const };

    if (!user.email_verified){
        return { user, error: "unverified" as const };
    } 

    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) return { user: null, error: "invalid" as const };

    return { user, error: null };
};
const createLoginResponse = async (
    req: Request,
    user: NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>
) => {
    const userAgent = req.headers["user-agent"] || "unknown";
    const deviceIp = req.ip || "unknown";
    const deviceInfo = getDeviceInfo(userAgent, deviceIp);

    const session = await createSession(
        user.id,
        deviceInfo.deviceId,
        deviceInfo.operatingSystem,
        deviceInfo.deviceName,
        deviceIp
    );

    const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionId: session.id
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await saveRefreshToken(user.id, session.id, refreshToken, refreshExpiresAt);
    await saveSessionToRedis(session.id, user.id, session.expires_at);
    await saveUserToRedis({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified
    });

    return { session, accessToken, refreshToken };
};

export const login = async (req: Request, res: Response):Promise<void> => {
    try {
        const email=normalizeEmail(req.body.email)
        const password=req.body.password as string
        const result=await checkCredentials(email,password)
       if(result.error === "unverified"){
        res.status(403).json({
            message:"please verify your email before logging in "
        })
        return
       }
       if (!result.user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        
        const activeSession=await getActiveSession(result.user.id)
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
        const tokens=await createLoginResponse(req,result.user)
        res.status(200).json({
            status: "success",
            success: true,
            message: "Login successful",
            data: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                email_verified: result.user.email_verified
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            session: {
                id: tokens.session.id,
                loginTimestamp: tokens.session.login_timestamp,
                expiresAt: tokens.session.expires_at,
                status: tokens.session.status
            }
        });

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
        const email = normalizeEmail(req.body.email);
        const password = req.body.password as string;
        const result = await checkCredentials(email, password);

        if (result.error === "unverified") {
            res.status(403).json({ message: "Please verify your email before logging in" });
            return;
        }
        if (!result.user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
            
        const activeSession=await getActiveSession(result.user.id)
        if(activeSession){
            await closeSessionById(activeSession.id)
            await deleteSessionFronRedis(activeSession.id)
            const oldRefreshToken=await getRefreshTokenBySessionId(activeSession.id)
            if(oldRefreshToken){
                await deleteRefreshToken(oldRefreshToken.token)
            }
            
        }
        const tokens = await createLoginResponse(req, result.user);
        res.status(200).json({
            status: "success",
            success: true,
            message: "Login successful",
            data: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                email_verified: result.user.email_verified
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            session: {
                id: tokens.session.id,
                loginTimestamp: tokens.session.login_timestamp,
                expiresAt: tokens.session.expires_at,
                status: tokens.session.status
            }
        });        
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
        const token=req.body.refreshToken as string
        if (!token) {
            res.status(401).json({ message: "Refresh token required" });
            return;
        }
        const decoded = verifyRefreshToken(token);
        const storedToken = await getRefreshToken(token);
        if (!storedToken) {
            res.status(401).json({ 
                message: "Invalid or expired refresh token" 
            });
            return;
        }

        if (storedToken.session_id !== decoded.sessionId) {
            res.status(401).json({ 
                message: "Refresh token does not belong to this session" 
            });
            return;
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
        if (!closedSession) {
            res.status(401).json({
                message: "Session could not be closed"
            })
            return
        }
        await deleteSessionFronRedis(oldSession.id)
        await deleteRefreshToken(token)

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
        if (!newSession) {
            res.status(500).json({
            message: "Failed to create new session"
            });
            return;
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
        const token=req.body.refreshToken as string        
        if(!token){
            res.status(400).json({
                message:"refresh token not found"
            })
            return
        }
         // We use a separate query here because
        // even an expired refresh token should allow
        // us to find the session and close it.
        const storedToken=await getRefreshTokenForLogout(token)
        if(!storedToken){
            res.status(404).json({
                message:"refresh token not found"
            })
            return
        }
        const closedSession=await closeSessionById(storedToken.session_id)
        await deleteSessionFronRedis(storedToken.session_id)
        await deleteRefreshToken(token)       
        
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
            await saveUserToRedis(user as {
                id:number;
                name:string;
                email:string;
                role:string;
                email_verified: boolean;
            })
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
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(400).json({ message: "Invalid user ID" });
            return;
        }
        const redisUser=await getUserByIdFromRedis(userId)
        if(redisUser){
            console.log("retrived user from redis")
            res.status(200).json(redisUser)
            return
        }

        const result = await getUserById(userId)
        if (!result) {
            res.status(404).json({
                message:"user not found"
            })
            return
        }
        await saveUserToRedis(result as {
            id:number;
            name:string;
            email:string;
            role:string;
            email_verified:boolean;
        })

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
         const { name, role } = req.body
         const email=normalizeEmail(req.body.email)
         if(!name || !email || !role){
            res.status(400).json({
                message:"All field are required"
            })
            return
         }
         const existing=await getUserById(userId)
         if(!existing){
            res.status(404).json({
                message:"user not found"
            })
            return
         }
         const emailChanged=existing.email.toLowerCase()!==email
         const conflictingUser =emailChanged ? await getUserByEmail(email) : null
         if(conflictingUser && conflictingUser.id !==userId){
            res.status(409).json({
                message:"Email is already used by another account"
            })
            return
         }
        
        const user = await updateUser(
            userId,
            name,
            email,
            role
        )
        if (!user) {
            res.status(404).json("user not found")
            return
        }
        if(emailChanged){
            await queueVerificationEmail(user)
        }
        try {
            await saveUserToRedis(user);
            console.log("User cache updated in Redis");
        }
        catch (redisError) {
            console.log("Redis cache update failed:", redisError);
        }

        res.status(200).json({
            message: emailChanged
                ? "User updated. Verify the new email address before logging in."
                : "User updated successfully",
            data: user
        });
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

        if (!result) {
            res.status(404).json("user not found");
            return;
        }
        await deleteUserFromRedis(result.id)


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
       const email = normalizeEmail(req.body.email)
        const genericMessage ="If an account exists for this email, a password reset link will be sent.";
        const user = await getUserByEmail(email);
        if (!user) {
            res.status(200).json({
                message: genericMessage
            });
            return;
        }
        const token=crypto.randomBytes(32).toString("hex")        
        await savePasswordResetToken(user.id, token);

        const baseUrl = process.env.PASSWORD_RESET_URL;
        if (!baseUrl) {
            throw new Error(
                "PASSWORD_RESET_URL is not configured"
            );
        }
        const url=`${baseUrl}?email=${encodeURIComponent(email)}&resetToken=${encodeURIComponent(token)}`
        await addEmailJob({
            type:"reset-password",
            to:email,
            name:user.name,
            url
        })
        res.status(200).json({
            message: genericMessage
        });
    } catch (error) {
        console.error("Forgot password error:", error);

        res.status(500).json({
            message: "Unable to process the password reset request"
        });
    }
};
export const resetPassword=async(req:Request,res:Response):Promise<void>=>{
    try{
        const email=normalizeEmail(req.body.email)
        const {resetToken,newPassword}=req.body
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
        if(!updatedUser){
            res.status(404).json({
                message:"user not found"
            })
            return
        }
        await deletePasswordResetToken(user.id)
        try {
            await saveUserToRedis(updatedUser);
        } catch (redisError) {
            console.error("Redis cache update failed:", redisError);
        }

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
        if(!userId || !req.user){
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
        try {
            await saveUserToRedis(updatedUser);
        }
        catch (redisError){
            console.error("Redis cache update failed:", redisError);
        }
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

