import express from "express";
import { register, login,refreshToken,logout, getUsers, getUserByID, updateUserById, deleteUserById,loginHistory } from "../controllers/userController"
import { verifyToken } from "../middleware/authmiddleware";
import { registerValidation,loginvalidation,updateValidation} from "../validations/userValidation";
import { validate } from "../middleware/validationMiddleware";
const router = express.Router()


router.post("/register",registerValidation,validate, register)
router.post("/login",loginvalidation,validate, login)
router.post("/refresh",refreshToken)
router.post("/logout",logout)
router.get("/history/:userId",verifyToken,loginHistory)
router.get("/", verifyToken, getUsers)
router.get("/:id", verifyToken, getUserByID)
router.put("/:id", verifyToken,updateValidation,validate, updateUserById)
router.delete("/:id", verifyToken, deleteUserById)


export default router