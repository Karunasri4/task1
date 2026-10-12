import { Queue } from "bullmq";
import bullmqConnection from "../config/bullmq";
export interface EmailJobData{
    type:"verify-email" | "reset-password";
    to:string;
    name:string;
    url:string;
}
 export const emailQueue=new Queue("email-queue",{
    connection:bullmqConnection,
    defaultJobOptions:{
        attempts:3,
        backoff:{
            type:"exponential",
            delay:2000
        },
        removeOnComplete:100,
        removeOnFail:false
    }
})
export const addEmailJob=async(data:EmailJobData):Promise<void>=>{
    await emailQueue.add(data.type,data)
    console.log(data)
}