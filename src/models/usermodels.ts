import { DataTypes,Model,Optional } from "sequelize";
import sequelize from "../config/db";
import { BlockList } from "node:net";

interface UserAttributes{
    id:number;
    name:string;
    email:string;
    password:string;
    role:string;
    email_verified:boolean;
}
interface UserCreationAttributes extends Optional<UserAttributes,"id" | "email_verified">{}
class User extends Model<UserAttributes,UserCreationAttributes> implements UserAttributes{
    declare id:number;
    declare name:string;
    declare email:string;
    declare password: string;
    declare role: string;
    declare email_verified:boolean;
}
User.init(
    {
        id:{
            type:DataTypes.INTEGER,
            autoIncrement:true,
            primaryKey:true
        },
        name:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        email:{
            type:DataTypes.STRING,
            allowNull:false,
            unique:true
        },
        password:{
            type:DataTypes.STRING,
            allowNull:false
        },
        role:{
            type:DataTypes.STRING,
            allowNull:false
        },
        email_verified:{
            type:DataTypes.BOOLEAN,
            allowNull:false,
            defaultValue:false
        }
    },
    {
        sequelize,
        timestamps:false,
        modelName:"User",
        tableName:"usertable"
    }

)
const safeUser = (user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    email_verified: user.email_verified
});

export const createUser=async(
    name:string,
    email:string,
    password:string,
    role:string,
    
)=>{
    const user=await User.create({
        name,
        email,
        password,
        role
    })
    return safeUser(user)
}

export const getAllUsers=async()=>{
    return User.findAll({
        attributes:["id","name","email","role"],
        raw:true,
    })
}
export const getUserById=async(id:number)=>{
    return await User.findOne({
        where:{id},
        attributes:{
            exclude:["password"]
        },
        raw:true,
    })
}

export const getUserByEmail=async(email:string)=>{
    return await User.findOne({
        where:{email},
    })
}

export const updateUser=async(id:number,name:string,email:string,role:string)=>{
    const user=await User.findByPk(id)
    if(!user){
        return null;
    }
    const emailChanged=user.email.toLowerCase()!==email.toLowerCase() 
    await user.update({name,email,role,...(emailChanged ? {email_verified:false}:{})})
    return safeUser(user)
    
}
export const updateUserPassword=async(id:number,password:string)=>{
    const user=await User.findByPk(id);
    if(!user){
        return null
    }
    await user.update({password})
    return {
        id:user.id,
        name:user.name,
        email:user.email,
        role:user.role
    }
}

export const deleteUser=async(id:number)=>{
    const user=await User.findByPk(id)
    if(!user){
        return null
    }
    const result=safeUser(user)
    await user.destroy()
    return result
}
export const markEmailVerified=async(userId:number):Promise<boolean>=>{
    const user=await User.findByPk(userId)
    if(!user){
        return false
    }
    await user.update({
        email_verified:true
    })
    return true
}

export default User


















