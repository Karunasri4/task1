
import { DataTypes,Model,Optional } from "sequelize"
import sequelize from "../config/db"
interface SessionAttributes{
    id:number;
    user_id:number;
    device_id:string;
    operating_system:string;
    device_name:string;
    device_ip:string;
    login_timestamp:Date;
    logout_timestamp:Date | null;
    expires_at:Date;
    status:number;
}
interface SessionCreationAttributes extends Optional<SessionAttributes,"id" | "login_timestamp" | "logout_timestamp">{}
class LoginSession extends Model<SessionAttributes,SessionCreationAttributes> implements SessionAttributes{
    declare id:number;
    declare user_id:number;
    declare device_id: string;
    declare operating_system: string;
    declare device_name: string;
    declare device_ip: string;
    declare login_timestamp: Date;
    declare logout_timestamp: Date | null;
    declare expires_at: Date;
    declare status: number;
}

LoginSession.init(
    {
        id:{
            type:DataTypes.INTEGER,
            autoIncrement:true,
            primaryKey:true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        device_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        operating_system: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        device_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        device_ip: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        login_timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        logout_timestamp: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
    },
    {
        sequelize,
        timestamps:false,
        modelName:"LoginSession",
        tableName:"login_history",
        paranoid:true,
        deletedAt:'destroyedTimestamp',
        
    }
)

export const createSession=async(
    userId:number,
    deviceId:string,
    operatingSytsem:string,
    deviceName:string,
    deviceIp:string
)=>{
    const loginTimestamp = new Date();
    console.log(loginTimestamp)
    console.log(loginTimestamp.getTime())
    const expiresAt = new Date(loginTimestamp.getTime() + 2 * 60 * 60 * 1000);
    console.log("Before Sequelize create:");
    console.log("Login timestamp:", loginTimestamp);
    console.log("Expires at:", expiresAt);


    const session=await LoginSession.create({
    user_id:userId,
    device_id: deviceId,
    operating_system: operatingSytsem,
    device_name: deviceName,
    device_ip: deviceIp,
    login_timestamp: loginTimestamp,
    expires_at: expiresAt,
    status: 1,
    logout_timestamp: null,
    })
    console.log("After Sequelize create:");
    console.log("Session ID:", session.id);
    console.log("Login timestamp:", session.login_timestamp);
    console.log("Session expires at:", session.expires_at);

    
    return session
}
export const getActiveSession=async(userId:number)=>{
    return await LoginSession.findOne({
        where:{
            user_id:userId,
            status:1
        },
        order:[["id","DESC"]]
    })
}
export const getSessionById=async(sessionId:number)=>{
    return await LoginSession.findByPk(sessionId)
}
export const closeSessionById=async(sessionId:number)=>{
    const session= await LoginSession.findOne({
        where:{id:sessionId,status:1}
    })
    if(!session){
        return null
    }
    await session.update({
        logout_timestamp:new Date(),
        status:0,
    })
    return session
}
export const getUserLoginHistory=async(userId:number)=>{
    return await LoginSession.findAll({
        where:{user_id:userId},
        order:[["id","DESC"]],
        raw:true
    })
}
export default LoginSession

