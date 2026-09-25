import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization
    const JWT_SECRET = "thisissecret"
    if (!token) {
        res.status(401).json("token required")
        return
    }

    const actualToken = token.split(" ")[1]
    const decoded = jwt.verify(actualToken, JWT_SECRET) as {
        email: string
        role: string
    }
    console.log(decoded)

    if (decoded.role === "instructor") {
        next()
    }
    else {
        res.status(401).json("you are not authorised")
    }


}