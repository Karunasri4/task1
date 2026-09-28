import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2"
import {
    createUser,
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    deleteUser,
    saveRefreshToken,
    getRefreshToken,
    deleteRefreshToken
} from "../models/usermodels";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    
} from "../utils/token";
import { json } from "body-parser";
import { decode } from "node:punycode";
  

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body
        if (!name || !email || !password || !role) {
            res.status(400).json({
                message: "All fields are required"
            })
        }
        const existingUser = await getUserByEmail(email)
        if (existingUser.rows.length > 0) {
            res.status(409).json({
                message: "user already exist"
            })
            return
        }
        const hashedPassword = await argon2.hash(password);
        const result = await createUser(name, email, hashedPassword, role)

        res.status(201).json({
            message: "user registered successfully",
            user: result.rows[0]
        })

    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })

    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body
        const result = await getUserByEmail(email)
        if (result.rows.length == 0) {
            res.status(404).json({
                message: "User Not fount"
            })
            return
        }
        const user = result.rows[0]
        const passwordMatch = await argon2.verify(user.password, password)
        if (!passwordMatch) {
            res.status(401).json({
                message: "Inavalid password"
            })
            return

        }
        const payload = {
            id: user.id,
            name:user.name,
            email: user.email,
            role: user.role
        }
        const accessToken = generateAccessToken(payload)
        const refreshToken = generateRefreshToken(payload)


        const expiresAt = new Date()
        expiresAt.setDate(
            expiresAt.getDate() + 7
        )
        await saveRefreshToken(user.id, refreshToken, expiresAt)

        

        res.status(200).json({
            "status": "success",
            "success": true,
            "message": "Account details retrieved successfully.",
            "data": {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            "accessToken": accessToken,
            "refreshToken": refreshToken
        })


    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })

    }

}
//REFRESH ACCESS TOKEN
export const refreshToken = async (req: Request, res: Response):Promise<void> => {
    try {
        const {refreshToken} = req.body//get from request body
        if (!refreshToken) {
            res.status(401).json({
                message: "Refresh Token required"
            })
            return
        }
        const decoded = verifyRefreshToken(refreshToken) as {
            id: number,
            name:string,
            email: string,
            role: string
        }
        console.log("Decoded resfresh token",decoded)
        const result=await getRefreshToken(refreshToken)

        if(result.rows.length===0){
            res.status(401).json({
                message:"Invalid or expired refresh Token"
            })
            return
        }
        const payload={
            id:decoded.id,
            name:decoded.name,
            email:decoded.email,
            role:decoded.role
        }
        const newAccessToken=generateAccessToken(payload)
        res.status(200).json({
            "status": "success",
            "success": true,
            "message": "Account details retrieved successfully.",
            "data": {
                id: payload.id,
                name: payload.name,
                email: payload.email,
                role: payload.role
            },
            "accessToken": newAccessToken,
            "refreshToken": refreshToken
        })
        
        
    }
    catch(err){
        console.log(err)
        res.status(401).json({
            message:"Invalid or expired refresh token"
        })
    }
   
}
export const logout=async(req:Request,res:Response):Promise<void>=>{
    try{
        const {refreshToken}=req.body//get from request body
        if(refreshToken){
            await deleteRefreshToken(refreshToken)
        }
       
        res.status(200).json({
                "status": "success",  
                "success": true,  
                "message": "Logout successfull.",  
                
            })

    }
    catch(err){
        console.log(err)
        res.status(500).json({
            "status": "failed",  
            "success": false,  
            "message": "Something went wrong."
            })
    }
}
export const getUsers = async (req: Request, res: Response):Promise<void> => {
    try {
        const result = await getAllUsers()
        console.log(result)
        console.log(result.rows)
        res.status(200).json(result.rows)
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })
    }
}
export const getUserByID = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId=Number(id)
        if(isNaN(userId)){
            res.status(400).json({
                message:"Invalid user ID"
            })
            return
        }

        const result = await getUserById(userId)
        if (result.rows.length === 0) {
            res.status(404).json("user not found")
            return
        }

        res.status(200).json(result.rows[0])
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })

    }
}

export const updateUserById = async (req: Request, res: Response):Promise<void>=> {
    try {
        const { id } = req.params
       
        const userId = Number(id)
        if (isNaN(userId)) {
            res.status(400).json("invalid user id");
            return;
        }
         const { name, email, password, role } = req.body
         if(!name || !email || !password || !role){
            res.status(400).json({
                message:"All field are required"
            })
            return 
         }
        const hashedPassword = await argon2.hash(password)
        
        const result = await updateUser(
            userId,
            name,
            email,
            hashedPassword,
            role
        )
        if (result.rows.length === 0) {
            res.status(404).json("user not found")
            return
        }

        res.status(200).json({
                "status": "success",  
                "success": true,  
                "message": "user updated successfully.",  
                "data": result.rows[0]
                    })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })
    }


}

export const deleteUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId=Number(id)
        if(isNaN(userId)){
            res.status(400).json({
                message:"Invalid user ID"
            })
            return
        }
        const result = await deleteUser(userId)

        if (result.rows.length === 0) {
            res.status(404).json("user not found");
            return;
        }


        res.status(200).json("user deleted successfully");
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            "status": "failed",
            "success": false,
            "message": "Something went wrong."
        })
    }
}


