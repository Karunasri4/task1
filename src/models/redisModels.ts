
import redisClient from "../config/redis";
export const saveSessionToRedis=async(sessionId:number,userId:number,expiresAt:Date):Promise<void>=>{
    const key=`session:${sessionId}`
    const sessionData={sessionId,userId}
    const expirySeconds=Math.max(1,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000))
    await redisClient.set(key,JSON.stringify(sessionData),{EX:expirySeconds})
}

export const getSessionFromRedis=async(sessionId:number)=>{
    const key=`session:${sessionId}`
    const session=await redisClient.get(key)
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
        role:string
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

