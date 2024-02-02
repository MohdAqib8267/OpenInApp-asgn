import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { userRoute } from "./routes/userRoute.js";
import { taskRouter } from "./routes/taskRoute.js";


dotenv.config();
const PORT = process.env.PORT || 3000;  

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());

//routes

//user Authentication
app.use('/api/user',userRoute);

//task routes
app.use('/api/task',taskRouter);



app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})
