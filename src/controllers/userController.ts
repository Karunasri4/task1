import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createUser, getAllUsers, getUserById, getUserByEmail, updateUser, deleteUser } from "../models/usermodels";

export const register = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body
    const result = await createUser(name, email, password, role)
    res.status(200).json(result.rows[0])
}

export const login = async (req: Request, res: Response) => {
    const JWT_SECRET = "thisissecret"
    const { email, password } = req.body
    let result = await getUserByEmail(email)
    if (result.rows.length === 0) {
        res.status(404).json("user not found")
        return
    }
    const user = result.rows[0]
    if (user.password !== password) {
        res.status(401).json("invalid password")
        return
    }
    const payload = {
        name: user.name,
        role: user.role
    }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" })
    res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token
    })
}

export const getUsers = async (req: Request, res: Response) => {
    try {
        const result = await getAllUsers()
        console.log(result)
        console.log(result.rows)
        res.status(200).json(result.rows)
    }
    catch (err) {
        console.log(err)
    }
}
export const getUserByID = async (req: Request, res: Response) => {
    const { id } = req.params

    const result = await getUserById(Number(id))
    if ((await result).rows.length === 0) {
        res.status(404).json("user not found")
        return
    }

    res.status(200).json(result.rows[0])
}

export const updateUserById = async (req: Request, res: Response) => {
    const { id } = req.params
    const { name, email, password, role } = req.body
    const userId = Number(id)
    if (isNaN(userId)) {
        res.status(400).json("invalid user id");
        return;
    }
    const result = await updateUser(
        userId,
        name,
        email,
        password,
        role
    )
    if (result.rows.length === 0) {
        res.status(404).json("user not found")
        return
    }

    res.status(200).json(result.rows[0])


}

export const deleteUserById = async (req: Request, res: Response) => {
    const { id } = req.params
    console.log(id)
    console.log(Number(id))
    const result = await deleteUser(Number(id))
    console.log(result)
    console.log("=======================")
    console.log(result.rows)

    if (result.rows.length === 0) {
        res.status(404).json("user not found");
        return;
    }

    res.status(200).json("user deleted successfully");
}


