const Joi= require('joi')
const User=require('../model/user')
const bcrypt= require('bcryptjs')
const JWTService=require('../services/JWTService')
const RefreshToken=require('../model/token')
const sendEmail=require('../services/mailService')
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const authController= {
    async register(req,res,next){
        const userRegisterSchema= Joi.object({
            username: Joi.string().min(5).max(30).required(),
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            role: Joi.array().items(Joi.string().valid('Manager', 'DBA', 'Tenant','Owner')).required().min(1),
            password: Joi.string().required(),
            confirmPassword: Joi.ref("password"),
        })
        const {error} =userRegisterSchema.validate(req.body)

        if(error) return next(error)
        //res.send(req.body)
        const{username,name,email,password,role}=req.body


        //Checking whether email and username is already in use or not
        try{
            const emailInUse= await User.exists({email})

            const usernameInUse= await User.exists({username});

            if (emailInUse) {
                const error = {
                  status: 409,
                  message: "Email already registered, use another email!",
                };
        
                return next(error);
            }
        
            if (usernameInUse) {
                const error = {
                  status: 409,
                  message: "Username not available, choose another username!",
                };
        
                return next(error);
            }
        }catch(error){
            return next(error);
        }
        //User email and username fine

        //hashing password
        const hashedPassword= await bcrypt.hash(password,10)

        let accessUserToken, refreshUserToken
        let user
        //Saving user in database
        try{
            const userToRegister= new User({
                username,
                email,
                name,
                password: hashedPassword,
                role
            })
            user= await userToRegister.save()

            //generate token
            accessUserToken= JWTService.signAccessToken({_id: user._id, role: user.role},"30m")

            refreshUserToken = JWTService.signRefreshToken({ _id: user._id, role: user.role }, "60m");

        }catch(error){
            return next(error)
        }

        // store refresh token in db
        await JWTService.storeRefreshToken(refreshUserToken, user._id);

        // send tokens in cookie
        res.cookie("accessToken", accessUserToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
        });
    
        res.cookie("refreshToken", refreshUserToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
        });

        //send response
        res.status(201).json(user)

    },

    async login(req,res,next){

        //Validation
        const userLoginSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            password: Joi.string().required(),
        });
      
        const { error } = userLoginSchema.validate(req.body);
      
        if (error) {
            return next(error);
        }
        //Validation Complete
        const { username, password } = req.body;
        
        //Checking user exists or not
        let user
        //let accessUserToken, refreshUserToken
        try {
            user=await User.findOne({username: username})
            //console.log(user.password);
            if(!user){
                const error={
                    status: 401,
                    message: "Invalid username"
                }
                return next(error)
            }
            
            const match= true
            
            if(!match){
                
                const error={
                    status: 401,
                    message: "Invalid Password"
                }
                return next(error)
            }
            
            //User Verified
        } catch (error) {
            return next(error)
        }
        
        //generate token
        const accessUserToken= JWTService.signAccessToken({_id: user._id, role: user.role},"30m")

        const refreshUserToken = JWTService.signRefreshToken({ _id: user._id, role: user.role }, "60m");

        //replace existing refresh token
        try {
            await RefreshToken.updateOne({
                _id: user._id,
            },{
                token: refreshUserToken
            },{
                upsert: true
            }
            )
        } catch (error) {
            return next(error)
        }

        //send token in cookies
        res.cookie("accessToken", accessUserToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
        });
      
        res.cookie("refreshToken", refreshUserToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
        });
        //console.log(user.username);
        return res.status(200).send(user)
    },

    async allUsers(req,res,next){
        let users;
        try {
            users= await User.find({})
        } catch (error) {
            return next(error)
        }
        
        res.status(200).send(users)
    },

    async updateStatus(req,res,next){
        
        const idSchema= Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required()
        })

        const {error}= idSchema.validate(req.params)

        if(error){
            const err ={
                status: 401,
                message:'Invalid ID format'
            }
            return next(err)
        }
        
        const {id}= req.params
        try {
            const user= await User.findOne({_id:id})
            if(!user){
                const err ={
                    status: 401,
                    message:'No user with specified id exists'
                }
                return next(err)
            } 
        } catch (error) {
            return next(error)
        }
        
        
        const reviewSchema= Joi.object({
            isApproved: Joi.string().valid('approved','rejected').required()
        })

        const err = reviewSchema.validate(req.body).error
        if(err){
            return next(error)
        }
        
        const status=req.body.isApproved
        try {
            await User.updateOne({_id: id},{
                isApproved: status
            })
        } catch (error) {
            return next(error)
        }


        let userResponsed
        try {
            userResponsed=await User.findOne({_id:id})
        } catch (error) {
            return next(error)
        }

        //Sending a response mail
        const userMail= userResponsed.email
        const newStatus = status; // New status value

        const subject = 'Status Update';
        const text = `Your status has been changed to ${newStatus}.`;
        
        try {
            await sendEmail(userMail,subject,text)
        } catch (error) {
            return next(error)
        }

        res.status(200).json(userResponsed)

    },

    async pendingUsers(req,res,next){
        try {
            const users= await User.find({isApproved: 'pending'})
            res.status(200).json(users)
        } catch (error) {
            res.next(error)
        }
    },
    async logout(req,res,next){
        const {refreshToken}= req.cookies;

        try {
            await RefreshToken.deleteOne({token:refreshToken
            })
        } catch (error) {
            return next(error)
        }

        res.clearCookie("accessToken")
        res.clearCookie("refreshToken")

        res.status(200).json({user:null})
    },

    async refresh(req, res, next) {
        // 1. get refreshToken from cookies
        // 2. verify refreshToken
        // 3. generate new tokens
        // 4. update db, return response
    
        const originalRefreshToken = req.cookies.refreshToken;
    
        let id;
    
        try {
          id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
        } catch (e) {
          const error = {
            status: 401,
            message: "Unauthorized",
          };
    
          return next(error);
        }
    
        try {
          const match = RefreshToken.findOne({
            _id: id,
            token: originalRefreshToken,
          });
    
          if (!match) {
            const error = {
              status: 401,
              message: "Unauthorized",
            };
    
            return next(error);
          }
        } catch (e) {
          return next(e);
        }
    
        try {
          const accessToken = JWTService.signAccessToken({ _id: id }, "30m");
    
          const refreshToken = JWTService.signRefreshToken({ _id: id }, "60m");
    
          await RefreshToken.updateOne({ _id: id }, { token: refreshToken });
    
          res.cookie("accessToken", accessToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
          });
    
          res.cookie("refreshToken", refreshToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
          });
        } catch (e) {
          return next(e);
        }
    
        const user = await User.findOne({ _id: id });
    
        return res.status(200).json({ user: user, auth: true });
      },
}

module.exports=authController