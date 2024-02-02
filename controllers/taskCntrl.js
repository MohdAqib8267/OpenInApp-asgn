import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";
import cron from "node-cron";



// API to create a task
export const createTask=asyncHandler(async(req,res)=>{
    let {title,description,due_date,userId,status} = req.body;
    // console.log(req.body)
    try {
    
         // Validation
        if (!title || !description || !due_date || !userId) {
            return res.status(400).json({ error: 'Title, description,userId and due_date are required' });
        }
        //check user is exist for id or not
        const user = await prisma.user.findFirst({
            where:{id:userId},
        })
        if(!user){
            return res.status(401).json({error:'User not found'});
        }
        const parsedDueDate = new Date(due_date);
        if (isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({ error: 'Invalid due_date format' });
        }
        
        //create task
        const task = await prisma.task.create({
            data:{
                title,
                description,
                due_date:parsedDueDate,
                status,
                userId,
                priority:determinePriority(parsedDueDate)
            }
        })
        res.json({ success: true, data: task });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });

    }
})

//Create a SubTask
export const subTask=asyncHandler(async(req,res)=>{
    const {task_id} = req.body;
    try {
        if(!task_id){
            res.status(401).json({message:"task Id is required"});
        }
        const createSubTask = await prisma.subtasks.create({
            data:{
                task:{
                    connect:{id:task_id}
                },
                status:false,
            }
        })
        res.json({ success: true, data: createSubTask });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
})


//Get All User Task with pagination. its fetch according to pagination
export const getAllUserTask = asyncHandler(async(req,res)=>{
    const {userId,pageNumber,pageSize} = req.params;
    let {priority,due_date}=req.body;
    // console.log(req.params);
    try {
        if(!userId){
            return res.status(401).json({error:'userId is required'});
        }
        const parsedDueDate = new Date(due_date);
        if (isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({ error: 'Invalid due_date format' });
        }
        

        //here we have pass deletedAt should be null. That's mean task should not deleted.
        const userTasks = await prisma.task.findMany({
            where:{ 
                userId:userId,
                priority:priority,
                due_date:parsedDueDate,
                deletedAt:"2024-02-02T17:30:46.437+00:00"
            },
            //take and skip used for pagination. eg: take 3 and skip 4. so it taks 0-2 item and skip next 4 item
            take: pageSize ? parseInt(pageSize) : undefined,
            skip: pageNumber ? (parseInt(pageNumber) - 1) * (pageSize ? parseInt(pageSize) : 10) : undefined,
        })
        console.log(userTasks); 
        //sort according to priority in increasing order
        const sortedUserTasks = userTasks.sort((a, b) => a.priority - b.priority);
        res.json({ success: true, data: sortedUserTasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
})


//get all user subtasks
export const getSubTask=asyncHandler(async(req,res)=>{
    const {taskId}=req.params;
    try {
        if(!taskId){
            return res.status(400).json({error:'taskId is required'});
        }
        //here we have pass deletedAt should be null. That's mean task should not deleted.
        const subtasks = await prisma.subtasks.findMany({
            where:{
                taskId:taskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00" 
            }
        })
        return res.status(200).json({success:true,data:subtasks});
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
})

//update Task
export const updateTask=asyncHandler(async(req,res)=>{
    const {taskId} = req.params;
    const {due_date,status} = req.body; //please follow date structer like "02-02-2024". we will convert this by code
    try {
        //validate status
        if (status && !['TODO','IN_PROGRESS', 'DONE'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        //validate date format
        const parsedDueDate = new Date(due_date);
        if(due_date){
            
            if(isNaN(parsedDueDate.getTime())){
                return res.status(400).json({error:'date is not in correct formate. please follow like: 02-02-2024'});
            }
        }
    
        //first check task is present or not
        const task = await prisma.task.findFirst({
            where:{
                id:taskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00" 
            }
        })
        if(!task){
            return res.status(401).json({error:'task is not present'});
        }

        //update task
        const update = await prisma.task.update({
            where:{
                id:taskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00" 
            },
            data:{
                due_date:parsedDueDate && parsedDueDate,
                status:status && status
            }
        })
        // If the task status is updated to "IN_PROGRESS," update the status of associated subtasks
        if (status === 'IN_PROGRESS') {
            await prisma.subtasks.updateMany({
                where: {
                    taskId: taskId,
                    deletedAt: "2024-02-02T17:30:46.437+00:00" // Check for soft deletion
                },
                data: {
                    status: false,
                },
            });
        }
        // If the task is marked as "DONE," update the status of associated subtasks
        if (status === 'DONE') {
            await prisma.subtasks.updateMany({
              where: {
                taskId: taskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00"  
              },
              data: {
                status: true,
              },
            });
          }
         
    res.json({ success: true, data: update });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
})

//update subtask

export const updateSubTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { status, subtaskId } = req.body;

    try {
        if (!subtaskId || !taskId) {
            return res.status(400).json({ error: 'taskId or subtaskId is required' });
        }

        // Check if status is present and is a valid boolean
        if (typeof status !== 'undefined' && ![true, false].includes(status)) {
            return res.status(401).json({ error: 'Invalid status format. Please select true/false' });
        }

        // Check if task is available
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00" 
            },
            include: {
                subtasks: true,
            },
        });
        
        if (!task || !task.subtasks || task.subtasks.length === 0) {
            return res.status(402).json({ error: 'Task is not present for the given ID' });
        }
        

        // Check if subtask is present for the given taskId
        const subtaskToUpdate = task.subtasks.find(item => item.id === subtaskId && item.deletedAt=="2024-02-02T17:30:46.437+00:00");

        if (!subtaskToUpdate) {
            return res.status(401).json({ error: 'Subtask is not present for the given task ID' });
        }

        const update = await prisma.subtasks.update({
            where: {
                id: subtaskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00" 
            },
            data: {
                status: typeof status !== 'undefined' ? status : undefined,
            },
        });

        return res.status(200).json({ success: true, data: update });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


//Delete Task (soft deletion-> not permanatly delete from DB)
export const deleteTask = asyncHandler(async(req,res)=>{
    const { taskId } = req.params;
    console.log(taskId);
   try {
    

   if(!taskId){
    return res.status(400).json({error:'taskId is required'});
   }
   //detele task(soft deletion)
   const deletedTask = await prisma.task.update({
    where:{
        id:taskId,
        deletedAt:"2024-02-02T17:30:46.437+00:00"  //because we dont'want to delete a deleted subtask
    },
    data:{
        deletedAt:new Date()
    }
   })

    // Soft delete associated subtasks
    await prisma.subtasks.updateMany({
      where: {
         taskId: taskId,
         deletedAt:"2024-02-02T17:30:46.437+00:00" 
     },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({ success: true, data: deletedTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
})


//delete a subtask(soft deletion)
export const deleteSubTask = asyncHandler(async(req,res)=>{
    const { taskId } = req.params;
    const { subtaskId } = req.body;
    try {
        if (!subtaskId || !taskId) {
            return res.status(400).json({ error: 'taskId or subtaskId is required' });
        }

         // Check if task is available
         const task = await prisma.task.findUnique({
            where: {
                id: taskId,
                deletedAt:"2024-02-02T17:30:46.437+00:00"  
            },
            include: {
                subtasks: true,
            },
        });

        if (!task || task.subtasks.length === 0) {
            return res.status(402).json({ error: 'Task is not present for the given ID' });
        }
        // Check if subtask is present for the given taskId
        const subtaskToDelete = task.subtasks.find(item => item.id === subtaskId && item.deletedAt=="2024-02-02T17:30:46.437+00:00");
        if (!subtaskToDelete) {
            return res.status(401).json({ error: 'Subtask is not present for the given task ID' });
        }

        const deletedSubtask = await prisma.subtasks.update({
          where: { id: subtaskId,deletedAt:"2024-02-02T17:30:46.437+00:00"  }, //because we dont'want to delete a deleted subtask
          data: {
            deletedAt: new Date(),
          },
        });
    
        res.json({ success: true, data: deletedSubtask });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
})


//now we have update priority of task using node-cron. it's check due-date and update priority according to due date
cron.schedule('0 0 * * *',async(req,res)=>{
    
    //first of it's fetch all user accoring to their priority
    let users = await prisma.user.findMany({
        orderBy:[
            {
                priority:"asc"
            }
        ]
    });

    //now iterate through each user and find their task with their priority and due date
    for(let user of users){
        const userTasks = await prisma.task.findMany({
            where:{
                userId:user.id,
                deletedAt:"2024-02-02T17:30:46.437+00:00"   //feltch only not deleted task (soft deletion)
            },
            orderBy:[
                {
                    priority:"asc",
                },
                {
                    due_date:'asc'
                }
            ]
        }) 
        //   now Iterate through each user task
        for(let task of userTasks){
            const newPriority = determinePriority(task.due_date);
            await prisma.task.update({
                where: { id: task.id },
                data: { priority: newPriority },
            });

            //firstly task status would be TODO, so when we assign high priority task to update that status
            if(task.status === "TODO"){
                //call above update Status API
                console.log(`Scheduled a call for task ID ${task.id} for user with priority ${user.priority}`);
                await axios.patch(`http://localhost:8000/api/tasks/${task.id}/1/10`, { status: "IN_PROGRESS" });
            }
            //now we can schedule call based on subtask and user priority using twilio or knowlarity API

            //now a task is completed. so we have to change status to "DONE". and it's also updated all associated Subtasks
            await axios.patch(`http://localhost:8000/api/tasks/${task.id}/1/10`, { status: "DONE" });
        }
        
    }
    
    console.log('updated priorities');

})

function determinePriority(due_date){
    const today = new Date();
  const diffInDays = Math.floor((due_date - today) / (1000 * 60 * 60 * 24));
  return diffInDays;
}