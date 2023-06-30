const JWTService = require('../services/JWTService');
const User = require('../model/user');

const auth = async (req, res, next) => {
    try{
        // 1. refresh, access token validation
    const {refreshToken, accessToken} = req.cookies;

    if (!refreshToken || !accessToken){
        const error = {
            status: 401,
            message: 'Unauthorized'
        }

        return next(error)
    }

    let _id;

    try{
        _id = JWTService.verifyAccessToken(accessToken)._id;
        role= JWTService.verifyAccessToken(accessToken).role
        if(role != 'DBA'){
            const error = {
                status: 401,
                message: 'Unauthorized'
            }
    
            return next(error)
        }
    }
    catch(error){
        return next(error);
    }

    let user;

    try{
        user = await User.findOne({_id: _id});
    }
    catch(error){
        return next(error);
    }
    req.user = user;
    next();
    }
    catch(error){
        return next(error);
    }
}
module.exports = auth;