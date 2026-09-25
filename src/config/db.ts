import { Pool } from "pg";
import dotenv from "dotenv"
dotenv.config()

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD
})

pool.connect().then(() => {
    console.log("database connected successfully")
})
    .catch((err) => {
        console.log("connection failed", err)

    })
export default pool