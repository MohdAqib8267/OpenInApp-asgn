import express from "express";
import {login, signup } from "../controllers/userCntrl.js";
const router = express.Router();

//signup route
router.post('/register',signup);
router.post('/login',login);
export {router as userRoute};