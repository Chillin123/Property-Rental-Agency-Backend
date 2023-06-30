const Joi=require('joi')
const multer=require('multer')
const Property= require('../model/property')
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const {upload}=require('../helpers/filehelper')
const fs=require('fs')
const JWTService=require('../services/JWTService')
const path=require('path');
const getCoordinates=require('../services/locationService')
const PropertyLease=require('../model/propertyLease')

const propertyController={
    async propRegister(req,res,next){
        const propertyRegisterSchema=Joi.object({
            type:Joi.string().required(),
            status: Joi.string().valid('Available','Not Available').required(),
            owner_id: Joi.string().regex(mongodbIdPattern).required(),
            address:Joi.string().required(),
            rate: Joi.number().required(),
        })

        const {error}= propertyRegisterSchema.validate(req.body)

        if(error){
            return next(error)
        }
        const {type,status,owner_id,address,rate}=req.body

        //console.log(Property.exists(address));
        try {
            const addressInUse=await Property.exists({address})
            if(addressInUse){
                const error={
                    status:401,
                    message:'Property Already Registered'
                }
                return next(error)
            }
            
        } catch (error) {
            return next(error)
        }

        const obj=await getCoordinates(address)
        console.log(obj);
        const longitude=obj.longitude
        const latitude=obj.latitude

        let property
        try {
            const files= req.files;
            console.log(files);
            const files_loc=[]
            if(files){
                files.forEach(ele => {
                    files_loc.push(ele.path)
                });
            } 
            const propertyToRegister=new Property({
                type,
                status,
                owner_id,
                address,
                rate,
                files_loc,
                coordinates:{
                    type: 'Point',
                    coordinates: [longitude,latitude]
                }
            })
            property=await propertyToRegister.save()
        } catch (error) {
            return next(error)
        }
        

        res.status(200).json(property)
    },

    async deregister(req,res,next){
        const deletePropertySchema= Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        })

        const {error} = deletePropertySchema.validate(req.params)

        if(error){
            return next(error)
        }
        
        //Fetch owner id from tokens
        let ownerId
        try {
            const {refreshToken,accessToken}=req.cookies
            ownerId= JWTService.verifyAccessToken(accessToken)._id
        } catch (error) {
            return next(error)
        }

        const {id}=req.params

        try {
            const property=await Property.findOne({_id:id})

            if(property.owner_id!=ownerId){
                const error={
                    status:401,
                    message: 'You are not authorized to delete this property'
                }
                return next(error)
            }

            property.files_loc.forEach(ele => {
                fs.unlink(ele,(err)=>{
                    if(err){
                        const error={
                            status: 402,
                            message: 'Unable to delete file'
                        }
                        return next(error)
                    }
                })
            });
        } catch (error) {
            return next(error)
        }
        

        try {
            await Property.deleteOne({_id:id})
        } catch (error) {
            return next(error)
        }

        return res.status(200).json({message: 'Property Deleted'})
    },

    async getNearest(req,res,next){
        const address=req.body;

        const obj=await getCoordinates(address)
        console.log(obj);
        const targetLongitude=obj.longitude
        const targetLatitude=obj.latitude
        const sortBy=req.query.sortBy

        let properties
        try {
            let sortField='distance';
            if (sortBy === 'rate') {
                sortField = 'rate'; 
            } else {
                sortField = 'distance'; 
            }
            properties = await Property.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [targetLongitude, targetLatitude]
                        },
                        distanceField: 'distance',
                        maxDistance: 50000000,
                        spherical: true
                    }
                },
                {
                    $match:{
                        status: 'Available'
                    }
                },
                {
                    $sort: {
                        [sortField]: 1
                    }
                }
            ]);
          
            res.status(200).json(properties);
        } catch (error) {
            return next(error);
        }    
    },
    async rentProperty(req,res,next){
        let ownerId, renterId
        try {
            const {refreshToken,accessToken}=req.cookies
            renterId= JWTService.verifyAccessToken(accessToken)._id
        } catch (error) {
            return next(error)
        }
        const {propId}=req.params
        let property
        try {
            property= await Property.findOne({_id:propId})
            if(!property){
                const error={
                    status:401,
                    message:'Property Does not exist'
                }
                return next(error)
            }
            if(property.status=='Not Available'){
                const error={
                    status:401,
                    message:'Property not currently available for rent'
                }
                return next(error)
            }
        } catch (error) {
            return next(error)
        }
        ownerId= property.owner_id

        const propertyLeaseSchema=Joi.object({
            startDate: Joi.date().required(),
            endDate:Joi.date().required()
        })
        const {error}= propertyLeaseSchema.validate(req.body)
        if(error){
            return next(error)
        }

        const {startDate, endDate}= req.body
        console.log(req.body);
        let propLease
        try {
            const leaseToSave= new PropertyLease({
                prop_id: propId,
                owner_id: ownerId,
                renter_id: renterId,
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            })
            propLease= await leaseToSave.save()
        } catch (error) {
            return next(error)
        }

        try {
            await Property.updateOne(
                {_id:propId},
                {status: 'Not Available'})
        } catch (error) {
            return next(error)            
        }

        res.status(200).json(propLease)
    },
    async getRentHistory(req,res,next){
        const {id}=req.params
        let properties
        try {
            properties=await PropertyLease.find({prop_id:id})
            if(!properties){
                const error={
                    status:401,
                    message:'Property has never been rented before'
                }
                return next(error)
            }
            //console.log(properties);
            res.status(200).send(properties)
        } catch (error) {
            return next(error)
        }
    }
}

module.exports=propertyController