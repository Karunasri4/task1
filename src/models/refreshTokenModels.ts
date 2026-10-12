import { DataTypes,Model,Optional, where } from "sequelize";
import sequelize from "../config/db";

interface RefreshTokenAttributes{
    id:number;
    user_id:number;
    session_id:number;
    token:string;
    expires_at:Date;

}

type RefreshTokenCreationAttributes = Optional<RefreshTokenAttributes,"id">;
class RefreshToken extends Model<RefreshTokenAttributes,RefreshTokenCreationAttributes> implements RefreshTokenAttributes{
    declare id:number;
    declare user_id:number;
    declare session_id:number;
    declare token:string;
    declare expires_at:Date;
}
RefreshToken.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        timestamps: false,
        modelName: "RefreshToken",
        tableName: "refresh_tokens",
    }
)
export const saveRefreshToken = async (
    userId: number,
    sessionId: number,
    token: string,
    expiresAt: Date
) => {
    return await RefreshToken.create({
        user_id: userId,
        session_id: sessionId,
        token,
        expires_at: expiresAt,
    });
};
export const getRefreshToken =async(token:string)=>{
    const record=await RefreshToken.findOne({
        where :{
            token,
        },
    })
    if(!record){
        return null
    }
    if(record.expires_at <= new Date()){
        return null
    }
    return record
}
export const getRefreshTokenForLogout=async(token:string)=>{
    return RefreshToken.findOne({
        where:{
            token
        },
    })
}
export const getRefreshTokenBySessionId=async(sessionId:number)=>{
    return await RefreshToken.findOne({
        where:{
            session_id:sessionId,            
        },
        order:[["id","DESC"]],
    })
}
export const deleteRefreshToken=async(token:string)=>{
    return RefreshToken.destroy({
        where:{token}
    })
}

export default RefreshToken