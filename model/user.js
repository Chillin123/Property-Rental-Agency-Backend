const mongoose=require('mongoose')

const {Schema}=mongoose

const userSchema=new Schema({
    name: {type: String, required: true},
    username: {type: String, required:true},
    email: {type: String, required:true},
    password: {type: String, required:true},
    role:{
        type: [{
            type: String,
            enum:['Manager','DBA','Tenant','Owner']
        }],
        validate: {
            validator: function (roles) {
              return roles.length > 0;
            },
            message: 'At least one role must be assigned to the user.'
        },
        required: true,
        default:'Tenant'
    },
    isApproved: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
},
{timestamps: true})

module.exports=mongoose.model('User',userSchema,'users')