import express from "express";
import { register, login,forceLogin,refreshToken,logout, getUsers, getUserByID, updateUserById, deleteUserById,loginHistory, forgotPassword, resetPassword, updatedPassword} from "../controllers/userController"
import { verifyToken } from "../middleware/authmiddleware";
import { registerValidation,loginvalidation,updateValidation, resetPasswordValidation, updatePasswordValidation} from "../validations/userValidation";
import { validate } from "../middleware/validationMiddleware";
const router = express.Router()


router.post("/register",registerValidation,validate, register)
router.post("/login",loginvalidation,validate, login)
router.post("/force-login",loginvalidation,validate,forceLogin)
router.post("/refresh",refreshToken)
router.post("/logout",logout)
router.post("/reset-password",resetPasswordValidation,validate,resetPassword)
router.put("/update-password",verifyToken,updatePasswordValidation,validate,updatedPassword)
router.get("/history/:userId",verifyToken,loginHistory)
router.get("/", verifyToken, getUsers)
router.get("/:id", verifyToken, getUserByID)
router.put("/:id", verifyToken,updateValidation,validate, updateUserById)
router.delete("/:id", verifyToken, deleteUserById)


export default router