import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName:{
        type:String
    },
    email:{
        type:String
    },
    password:{
        type:String,
    },
    role:{
        type:String,
        require
    },
    phone:{
        type:Number
    }
},{timestamps:true});


const userModel = mongoose.model('user',userSchema);
export default userModel;

