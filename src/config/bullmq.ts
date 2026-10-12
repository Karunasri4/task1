import IOredis from "ioredis"
import dotenv from "dotenv"
dotenv.config()

const bullmqConnection = new IOredis({
    host:process.env.BULLMQ_REDIS_HOST || "127.0.0.1",
    port:Number(process.env.BULLMQ_REDIS_PORT || 6379),
    maxRetriesPerRequest:null
})
bullmqConnection.on("connect",()=>{
    console.log("BullMQ Redis connecting....")
})
bullmqConnection.on("ready",()=>{
    console.log("BullMQ Redis connected successfully")
})
bullmqConnection.on("error",(error)=>{
    console.log("BullMQ Redis error: ",error)
})
export default bullmqConnection