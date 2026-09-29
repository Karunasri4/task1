import { body } from "express-validator";
 export const registerValidation=[
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required"),
    
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is reuired")
        .isEmail()
        .withMessage("Enter a valid email"),
    
    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({min:8})
        .withMessage("Password must be atleast 8 characters")
        .matches(/[A-Z]/)
        .withMessage("password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/[0-9]/)
        .withMessage("Password must contain atleast one number")
        .matches(/[^A-Za-z0-9]/)
        .withMessage("Password must contain atleast one special character"),

    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(["admin","instructor","student"])
        .withMessage("Role must be admin,instructor or student")
        
 ]

export const loginvalidation=[
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is Required")
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
]
export const updateValidation=[
     body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage(
            "Password is required"
        )
        .isLength({ min: 8 })
        .withMessage(
            "Password must be at least 8 characters"
        )
        .matches(/[A-Z]/)
        .withMessage(
            "Password must contain at least one uppercase letter"
        )
        .matches(/[a-z]/)
        .withMessage(
            "Password must contain at least one lowercase letter"
        )
        .matches(/[0-9]/)
        .withMessage(
            "Password must contain at least one number"
        )
        .matches(/[^A-Za-z0-9]/)
        .withMessage(
            "Password must contain at least one special character"
        ),

    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(["admin", "instructor", "student"])
        .withMessage("Invalid role")

]