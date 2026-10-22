import {LoginSession} from '../models/sessionModels'
import {User} from '../models/usermodels'

User.hasOne(LoginSession,{foreignKey:'userId', as :'sessionsPerUser'})
LoginSession.belongsTo(User,{foreignKey:'userId',as :'user'})

export const getUserSessions=async(userId:number)=>{
    const userSessions=await LoginSession.findAll({
        where:{userId},
        include:[{
            model:User,
            as:'user'
        }]
    })
    return userSessions
}
