import nodemailer from "nodemailer";
import dotenv from "dotenv"
dotenv.config()

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;

const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST || "smtp.gmail.com",
    port:Number(process.env.SMTP_PORT || 587),
    secure:Number(process.env.SMTP_PORT || 587) ===465,
    auth:{
        user:smtpUser,
        pass:smtpPass
    }
})
export const sendEmail=async(to:string,subject:string,html:string):Promise<void>=>{
    const info=await transporter.sendMail({
        from:smtpFrom,
        to,
        subject,
        html
    })
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
        console.log("📧 Preview email here:", previewUrl)
    }
}