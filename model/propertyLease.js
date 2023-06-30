const mongoose= require('mongoose')
const {Schema}= mongoose

const propertyLeaseSchema = new Schema({
    prop_id: {type: mongoose.SchemaTypes.ObjectId, ref: 'Property'},
    renter_id: {type: mongoose.SchemaTypes.ObjectId, ref: 'User'},
    owner_id: {type: mongoose.SchemaTypes.ObjectId, ref: 'User'},
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    }
})

module.exports= mongoose.model('PropertyLease', propertyLeaseSchema, 'propertyLeases')