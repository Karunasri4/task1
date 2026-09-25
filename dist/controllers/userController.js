"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByID = exports.getUsers = exports.login = exports.register = void 0;
const register = (req, res) => {
    console.log("user resgistered");
    res.status(200).json("user registered successfully");
};
exports.register = register;
const login = (req, res) => {
    console.log("user logged in");
    res.status(200).json("user logged in");
};
exports.login = login;
const getUsers = (req, res) => {
    console.log("you get all users");
    res.status(200).json("get all users");
};
exports.getUsers = getUsers;
const getUserByID = (req, res) => {
    const { id } = req.params;
    console.log("user", id, " details");
    res.status(200).json("user with id diplayed");
};
exports.getUserByID = getUserByID;
