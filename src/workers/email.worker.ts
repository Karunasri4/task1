import { Worker } from "bullmq";
import bullmqConnection from "../config/bullmq";
import { EmailJobData } from "../queues/emailQueue";
import { sendEmail } from "../config/mail";
import { escape } from "querystring";

const worker=new Worker<EmailJobData>("email-queue",
    async(job)=>{
        const {type,to,name,url} = job.data
        if(type==="verify-email"){
            await sendEmail(to,"verify your email address",
                `<h2> Hello ${escapeHtml(name)} </h2>
                <p> Please verify uour email address.</p>
                <p>
                    <a href="${escapeHtml(url)}">
                        verify email
                    </a>
                </p>
                <p>this link expires in 15 minutes.</p>
                `
            )
        }
        else if(type === "reset-password"){
            await sendEmail(to,
                "reset your password",
                `<h2> Hello ${escapeHtml(name)}</h2>
                <p>you requested a password reset.</p>
                <p>
                    <a href="${escapeHtml(url)}">
                        reset password
                    </a>
                </p>
                <p> this linke expires in 15 minutes</p>`
            )
        }
        else{
            throw new Error(`Unsupported email type:${type}`)
        }
        console.log(`Email job ${job.id} completed`)
    },{
        connection:bullmqConnection,
        concurrency:5
    }
)

worker.on("completed",(job)=>{
    console.log("completed job: ",job.id)
})

worker.on("failed",(job,error)=>{
    
    console.log(`job ${job?.id} failed:`,error.message)
})

worker.on("error",(err)=>{
    console.log("email worker error:",err.message)
})

function escapeHtml(value:string):string{
    return value.replace(/[&<>"']/g,(character)=>{
        const entities:Record<string,string>={
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }
        return entities[character]
    })
}

async function startWorker():Promise<void> {
    await worker.waitUntilReady();
    console.log("Email worker is ready");    
}

startWorker().catch((err)=>{
    console.log("failed to start email worker: ",err)
    process.exitCode = 1
})