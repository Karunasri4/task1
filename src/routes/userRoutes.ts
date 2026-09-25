import express from "express";
import { register, login, getUsers, getUserByID, updateUserById, deleteUserById } from "../controllers/userController"
import { verifyToken } from "../middleware/authmiddleware";
import { deleteUser } from "../models/usermodels";
const router = express.Router()


router.post("/register", register)
router.post("/login", login)
router.get("/", verifyToken, getUsers)
router.get("/:id", verifyToken, getUserByID)
router.post("/user/update/:id", verifyToken, updateUserById)
router.delete("/user/delete/:id", verifyToken, deleteUserById)


export default router