const express= require('express')
const authController=require('../controller/authController')
const propertyController=require('../controller/propController')
const authDBA=require('../middleware/authDBA')
const authUser=require('../middleware/authUser')
const authUserRegister=require('../middleware/authUserRegister')
const {upload}=require('../helpers/filehelper')
const router=express.Router()


//register
router.post('/register',authController.register)

//Login
router.post('/login', authController.login)

//Get all users
router.get('/allUsers',authDBA,authController.allUsers)

//Update user
router.put('/updateStatus/:id', authDBA,authController.updateStatus)

//Pending status users
router.get('/pendingUsers',authDBA,authController.pendingUsers)


//Logout
router.post('/logout', authUser, authController.logout)

//Property Register
router.post('/propRegister',authUserRegister,upload.array("files",5),propertyController.propRegister)

//Property Delete
router.delete('/propDeregister/:id',authUserRegister,propertyController.deregister)

//Get properties
router.get('/getNearest', authUser, propertyController.getNearest)

//Rent properties
router.post('/rentProperty/:propId', authUser, propertyController.rentProperty)

//Get Rental history
router.get('/getRentHistory/:id',authUser, propertyController.getRentHistory)
module.exports=router