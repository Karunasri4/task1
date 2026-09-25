"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "10MB" }));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: "10MB"
}));
app.use("/users", userRoutes_1.default);
app.listen(3000, () => {
    console.log("server started on port 3000");
});
