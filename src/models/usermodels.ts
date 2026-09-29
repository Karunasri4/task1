import pool from "../config/db"

export const createUser =async  (
    name: string,
    email: string,
    password: string,
    role: string
    
) => {
    const query: string = `
    INSERT INTO userTable(name,email,password,role) 
    VALUES($1,$2,$3,$4) 
    RETURNING id, name, email, role;
    `;
    const result = await pool.query(query, [name, email, password, role])
    return result.rows[0]
}

export const getAllUsers =async ()=> {
    const query = `SELECT id,name,email,role FROM userTable`
    const result= await pool.query(query)
    return result.rows
}

export const getUserById =async (id: number)=> {
    const query = `SELECT id,name,email,role FROM userTable WHERE id=$1`
    const result= await pool.query(query, [id])
    return result.rows[0]
}

export const getUserByEmail = async(email: string) => {
    const query = `SELECT * from userTable WHERE email=$1`
    const result= await pool.query(query, [email])
    return result.rows[0]
}

export const updateUser =async (id: number, name: string, email: string, password: string, role: string) => {
    
    const query = `UPDATE userTable
            SET name=$1, email=$2, password=$3, role=$4
            WHERE id=$5
            RETURNING id,name,email,role `
    const result= await pool.query(query, [name, email, password, role, id])
    return result.rows[0]
    

}
export const deleteUser = async(id: number) => {

    const query = `DELETE FROM userTable WHERE id=$1 RETURNING *`
    const result=await pool.query(query, [id])
    return result.rows[0]
}

//refresh token queries
export const saveRefreshToken = async (userId: number,sessionId:number, token: string, expiresAt: Date) => {
    const query = `INSERT INTO refresh_tokens(user_id,session_id,token,expires_at)
                VALUES($1,$2,$3,$4)
                RETURNING *`
    const result=await pool.query(query, [userId,sessionId, token, expiresAt])
    return result.rows[0]
}

export const getRefreshToken=async(token:string)=>{
    const query=`SELECT * FROM refresh_tokens
                WHERE token =$1
                AND expires_at > NOW()`
    const result= await pool.query(query,[token])
    return result.rows[0]

}


// Used for logout.
// We don't check expiry here because we still want to
// find the session and close it.
export const getRefreshTokenForLogout = async (
    token: string
) => {

    const query = `
        SELECT *
        FROM refresh_tokens
        WHERE token = $1
    `;

    const result = await pool.query(
        query,
        [token]
    );

    return result.rows[0];
};
export const getRefreshTokenBySessionId=async(sessionId:number)=>{
    const query:string=`SELECT * FROM refresh_tokens
    WHERE session_id=$1 
    LIMIT 1`
    const result=await pool.query(query,[sessionId])
    return result.rows[0]
}
export const deleteRefreshToken=async(token:string)=>{
    const query=`DELETE FROM refresh_tokens WHERE token=$1`
    const result= await pool.query(query,[token])
    
}
