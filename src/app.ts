import express from "express";
import userRouter from "./routes/userRoutes";
import { connectRedis } from "./config/redis";
import {connectDB} from "./config/db"

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }))
app.use("/users", userRouter);
const startServer=async()=>{
    try{
        await connectDB()
        await connectRedis()
        app.listen(5000, () => {
            console.log("server started on port 5000");
        });
    }
    catch(err){
        console.log("Failed to start server",err)
    }
}

startServer()