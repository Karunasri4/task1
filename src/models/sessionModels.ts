import pool from "../config/db";
export const createSession=async (
    userId:number,
    deviceId:string,
    operatingSytsem:string,
    deviceName:string,
    deviceIp:string
)=>{
    const result=await pool.query(`INSERT INTO login_history(
        user_id,
        device_id,
        operating_system,
        device_name,
        device_ip,
        login_timestamp,
        expires_at,
        status) VALUES ( $1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '2 hours',1) RETURNING *`,
    [userId,deviceId,operatingSytsem,deviceName,deviceIp])
    return result.rows[0]

}
export const getActiveSession=async(userId:number)=>{
    const result=await pool.query(
        `SELECT * FROM login_history WHERE user_id=$1 AND status=1
        ORDER BY id DESC
        LIMIT 1`,[userId]
    )
    return result.rows[0]
}
export const getSessionById=async(sessionId:number)=>{
    const result=await pool.query(`SELECT * FROM login_history
                                    WHERE id=$1`,[sessionId])
    return result.rows[0]
}
export const closeSessionById=async(sessionId:number)=>{    
    const result=await pool.query(`UPDATE login_history
                                    SET logout_timestamp=CURRENT_TIMESTAMP,status=0
                                    WHERE id=$1 AND status=1 
                                    RETURNING *`,[sessionId])
    return result.rows[0]
}
export const getUserLoginHistory=async(userId:number)=>{
    const result=await pool.query(`SELECT * FROM login_history WHERE user_Id=$1 ORDER BY id DESC`,[userId])
    return result.rows
}