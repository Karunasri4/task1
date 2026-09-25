import { QueryResult } from "pg";
import pool from "../config/db"

export const createUser = (
    name: string,
    email: string,
    password: string,
    role: string
) => {
    const query = `
    INSERT INTO userTable(name,email,password,role) 
    VALUES($1,$2,$3,$4) 
    RETURNING *;
    `;
    return pool.query(query, [name, email, password, role])
}

export const getAllUsers = () => {
    const query = `SELECT * FROM userTable`
    return pool.query(query)
}

export const getUserById = (id: number) => {
    const query = `SELECT * FROM userTable WHERE id=$1`
    return pool.query(query, [id])
}

export const getUserByEmail = (email: string) => {
    const query = `SELECT * from userTable WHERE email=$1`
    return pool.query(query, [email])
}

export const updateUser = (id: number, name: string, email: string, password: string, role: string): Promise<QueryResult> => {
    try {
        const query = `UPDATE userTable
                SET name=$1, email=$2, password=$3, role=$4
                WHERE id=$5
                RETURNING * `
        return pool.query(query, [name, email, password, role, id])
    }
    catch (err) {
        console.log(err)
        return Promise.reject(err)
    }

}
export const deleteUser = (id: number): Promise<QueryResult> => {

    const query = `DELETE FROM userTable WHERE id=$1 RETURNING *`
    return pool.query(query, [id])
}