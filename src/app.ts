import express from "express";
import userRouter from "./routes/userRoutes";



const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }))
app.use("/users", userRouter);

app.listen(5000, () => {
    console.log("server started on port 5000");
});