import { Sequelize } from "sequelize"
import dotenv from "dotenv"
dotenv.config()

const sequelize=new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASSWORD as string,
    {
        host:process.env.DB_HOST!,
        port:Number(process.env.DB_PORT),
        dialect:"postgres",
        logging:false
    }
)
export const connectDB=async():Promise<void>=>{
    try{
        await sequelize.authenticate();
        console.log("database connected successfully")
    }
    catch(err){
        console.log("connection failed",err)
    }
}

export default sequelize;