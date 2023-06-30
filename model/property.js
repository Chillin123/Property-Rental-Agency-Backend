const { any } = require('joi');
const mongoose= require('mongoose')

const {Schema} = mongoose;

const propertySchema= new Schema({
    type: {type: String, required: true},
    status: {
        type:String,
        enum: ['Available','Not Available'],
        required:true,
        default:'Available'
    },
    owner_id: {type: mongoose.SchemaTypes.ObjectId,ref:'User'},
    address: {type: String,required: true},
    rate: {type: Number,required: true},
    files_loc: {type: [String]},
    coordinates:{
        type: {
                type: String,
                enum: ['Point'],
                required: true
            },
            coordinates:{
                type:[Number],
                required: true
            }
    }
})

propertySchema.index({coordinates:'2dsphere'})

module.exports= mongoose.model('Property', propertySchema,'properties')