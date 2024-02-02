import express from "express";
import {createTask, deleteSubTask, deleteTask, getAllUserTask, getSubTask, subTask, updateSubTask, updateTask } from "../controllers/taskCntrl.js";
import { verifyToken } from "../controllers/verifyToken.js";


const router = express.Router();

router.post('/create',verifyToken,createTask);
router.post('/create-subtask',verifyToken,subTask);
router.get('/get-user-task/:userId/:pageNumber/:pageSize',verifyToken,getAllUserTask);
router.get('/get-user-subtask/:taskId',verifyToken,getSubTask);
router.put('/update-task/:taskId',verifyToken,updateTask);
router.put('/update-subtask/:taskId',verifyToken,updateSubTask);
router.delete('/delete-task/:taskId',verifyToken,deleteTask);
router.delete('/delete-subtask/:taskId',verifyToken,deleteSubTask);

export {router as taskRouter};