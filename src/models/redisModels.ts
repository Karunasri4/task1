
import redisClient from "../config/redis";
import crypto from "crypto"
export const saveSessionToRedis=async(sessionId:number,userId:number,expiresAt:Date):Promise<void>=>{
    const key=`session:${sessionId}`
    const sessionData={sessionId,userId}
    const expirySeconds=Math.max(1,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000))
    console.log("Saving Redis session:");
    console.log("Key:", key);
    console.log("Data:", sessionData);
    console.log("Expiry:", expirySeconds);
    await redisClient.set(key,JSON.stringify(sessionData),{EX:expirySeconds})
    const savedValue=await redisClient.get(key)
    console.log("redis saved value: ",savedValue)
}

export const getSessionFromRedis=async(sessionId:number)=>{
    const key=`session:${sessionId}`
    
    console.log("Checking Redis key:", key);
    console.log("Redis connected:", redisClient.isReady);
    const session=await redisClient.get(key)
    console.log("Redis returned:", session);
    if(!session){
        return null
    }
    return JSON.parse(session)
}

export const deleteSessionFronRedis=async(sessionId:number):Promise<void>=>{
    const key=`session:${sessionId}`
    await redisClient.del(key)
}

const USER_HASH="users"

export const saveUserToRedis=async(
    user:{
        id:number,
        name:string,
        email:string,
        role:string,
        email_verified?:boolean
    }
):Promise<void>=>{
    await redisClient.hSet(USER_HASH,user.id.toString(),JSON.stringify(user))
}

export const getAllUsersFromRedis=async()=>{
    const users=await redisClient.hGetAll(USER_HASH)
    if(Object.keys(users).length===0){
        return null
    }
    return Object.values(users).map((user)=>JSON.parse(user))

}
export const getUserByIdFromRedis=async(userId:number)=>{
    const user=await redisClient.hGet(USER_HASH,userId.toString())
    if(!user){
        return null
    }
    return JSON.parse(user)
}
export const deleteUserFromRedis=async(userId:number)=>{
    await redisClient.hDel(USER_HASH,userId.toString())
}

//password reset token
//this is not user caching ,
// redis is used only s a temporary store 
// for the password reset token

export const savePasswordResetToken=async(userId:number,token:string):Promise<void>=>{
    const key=`password-reset:${userId}`
    await redisClient.set(key,token,{EX:900})
}
export const getPasswordRestToken=async(userId:number)=>{
    const key=`password-reset:${userId}`
    return await redisClient.get(key)
}
export const deletePasswordResetToken=async(userId:number):Promise<void>=>{
    const key=`password-reset:${userId}`
    await redisClient.del(key)
}

export const hashEmailToken = (token:string):string =>{
    return crypto.createHash("sha256").update(token).digest("hex")
}

export const saveEmailVerificationToken =async(tokenHash : string,userId:number):Promise<void>=>{
    await redisClient.set(`email-verification:${tokenHash}`,
        userId.toString(),
        {EX:900}
    )
}
export const getEmailVerificationUserId=async(tokenHash:string):Promise<number|null>=>{
    const userId=await redisClient.get(`email-verification:${tokenHash}`)
    if(!userId){
        return null
    }
    return Number(userId)
}
export const deleteEmailVerificationToken=async(tokenHash:string):Promise<void>=>{
    await redisClient.del(`email-verification:${tokenHash}`)
}
