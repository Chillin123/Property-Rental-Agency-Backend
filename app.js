const express=require('express')
const app=express()
const dbConnect=require('./database/index')
const errorHandler=require('./middleware/errorHandler')
const router=require('./routes/index')
const cookieParser=require('cookie-parser')

app.use(cookieParser())
app.use(express.json())
app.use(router)
dbConnect()
app.use(errorHandler)


app.listen(5000,()=>{
    console.log('Server running on port: 5000');
})