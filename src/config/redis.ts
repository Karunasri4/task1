import {createClient} from "redis"
import dotenv from "dotenv"
dotenv.config()

const redisClient=createClient({
    socket:{
        host:process.env.REDIS_HOST!,
        port:Number(process.env.REDIS_PORT)
    }
})

redisClient.on("error",(err)=>{
    console.log("redis error: ",err)
})
redisClient.on("connect",()=>{
    console.log("Redis connecting...")
})
redisClient.on("ready",()=>{
    console.log("redis connected successfully")
})
redisClient.on("end",()=>{
    console.log("Redis connection closed")
})

export const connectRedis=async():Promise<void>=>{
    if(!redisClient.isOpen){
        await redisClient.connect()
    }
}

export default redisClient