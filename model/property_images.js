const mongoose= require('mongoose')

const {Schema} = mongoose;

const property_filesSchema=new Schema({
    loc: {type: String, required:true},
    owner_id: {type: mongoose.SchemaTypes.ObjectId,ref:'User'},
    property_id: {type: mongoose.SchemaTypes.ObjectId,ref:'Property'}
})

module.exports= mogoose.model('Property_Files', property_filesSchema, 'property_files')