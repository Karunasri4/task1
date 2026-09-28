import jwt from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config()

interface payLoad {
    id:number,
    name:string,
    email: string,
    role: string
}

export const generateAccessToken = (payload: payLoad): string => {

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not defined");
    }

    return jwt.sign(payload, secret, {
        expiresIn: "20m"
    });
};


export const generateRefreshToken = (payload: payLoad): string => {

    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
        throw new Error("JWT_REFRESH_SECRET is not defined");
    }

    return jwt.sign(payload, secret, {
        expiresIn: "7d"
    });
};

export const verifyAccessToken = (token: string) => {
    const secret = process.env.JWT_ACCESS_SECRET
    if (!secret) {
        throw new Error("JWT ACCESS SECRET is not defined")
    }

    return jwt.verify(token, secret)
}

export const verifyRefreshToken = (token: string) => {
    const secret = process.env.JWT_REFRESH_SECRET
    if (!secret) {
        throw new Error("JWT ACCESS SECRET is not defined")
    }

    return jwt.verify(token, secret)
}

