import userModel from "../model";
import bcrypt from "bcryptjs"
import jwt from 'jsonwebtoken'
import { SECRET_KEY } from "../../../config/env";
import mongoose from "mongoose";

export async function createUser(req:any,res:any){
    const {...userdata} = req.body;
    try {
        const userExists = await userModel.findOne({email:userdata.email});
        if(userExists){
          res.status(200).json({status:'success', msg:'User already exists'});  
        }
        else{
        const encryptedPassword =  bcrypt.hashSync(userdata.password,10); 
        userdata.password = encryptedPassword;   
        const user = await userModel.create(userdata);
        res.status(200).json({status:'success', msg:'User Created Successfully'});
        }
    } catch (error) {
        res.status(500).json({status:'failure',msg:error});
    }
}

export async function getAllUsers(req:any,res:any){
    try {
        const users = await userModel.find({}).select('-password').lean();
        res.status(200).json({status:'success', users:users});
    } catch (error) {
        res.status(500).json({status:'failure', message:error});
    }

}


export async function loginUser(req:any,res:any){
    const {email,password} =  req.body;
    try {
        const user = await userModel.findOne({email:email});
        if(!user){
            return res.status(404).json({status:'failure', message:'email not found'});
            
        }
        const password_db = user?.password || ''; 
        const isValidPassword = bcrypt.compareSync(password,password_db);
        if(!isValidPassword){
            return res.status(401).json({status:'failure', message:'password not valid'});
        }

        if (!SECRET_KEY) {
            return res.status(500).json({status:'failure', message:'Server misconfigured (missing secret)'});
        }

        const safeUser = {
            id: String(user._id),
            email: user.email,
            role: user.role,
            userName: user.userName,
        };

        const token = jwt.sign({payload:safeUser},SECRET_KEY, {expiresIn:'30d'});
        res.cookie('authToken', token);
        return res.status(200).json({status:'success', message:'Login Success', token, user: safeUser});
    } catch (error) {
        return res.status(500).json({status:'failure', message:error})
    }

}

// --------------------
// Admin-only user CRUD
// --------------------

export async function adminListUsers(req: any, res: any) {
    try {
        const users = await userModel.find({}).select('-password').sort({ createdAt: -1 }).lean();
        return res.status(200).json({ status: 'success', users });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: error });
    }
}

export async function adminCreateUser(req: any, res: any) {
    try {
        const { userName, email, password, role, phone } = req.body ?? {};
        if (typeof email !== 'string' || email.trim() === '') {
            return res.status(400).json({ status: 'failure', message: 'email is required' });
        }
        if (typeof password !== 'string' || password.length < 4) {
            return res.status(400).json({ status: 'failure', message: 'password is required (min 4 chars)' });
        }
        if (typeof role !== 'string' || role.trim() === '') {
            return res.status(400).json({ status: 'failure', message: 'role is required' });
        }

        const userExists = await userModel.findOne({ email });
        if (userExists) {
            return res.status(409).json({ status: 'failure', message: 'User already exists' });
        }

        const created = await userModel.create({
            userName,
            email,
            password: bcrypt.hashSync(password, 10),
            role,
            phone,
        });

        const safe = await userModel.findById(created._id).select('-password').lean();
        return res.status(201).json({ status: 'success', user: safe });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: error });
    }
}

export async function adminUpdateUser(req: any, res: any) {
    try {
        const id = req.params?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'failure', message: 'Invalid user id' });
        }

        const update: any = {};
        if (typeof req.body?.userName === 'string') update.userName = req.body.userName;
        if (typeof req.body?.email === 'string') update.email = req.body.email;
        if (typeof req.body?.role === 'string') update.role = req.body.role;
        if (typeof req.body?.phone === 'number') update.phone = req.body.phone;
        if (typeof req.body?.phone === 'string' && req.body.phone.trim() !== '') {
            const n = Number(req.body.phone);
            if (Number.isFinite(n)) update.phone = n;
        }
        if (typeof req.body?.password === 'string' && req.body.password.trim() !== '') {
            update.password = bcrypt.hashSync(req.body.password, 10);
        }

        const user = await userModel.findByIdAndUpdate(id, update, { new: true }).select('-password').lean();
        if (!user) {
            return res.status(404).json({ status: 'failure', message: 'User not found' });
        }
        return res.status(200).json({ status: 'success', user });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: error });
    }
}

export async function adminDeleteUser(req: any, res: any) {
    try {
        const id = req.params?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'failure', message: 'Invalid user id' });
        }
        const deleted = await userModel.findByIdAndDelete(id).select('-password').lean();
        if (!deleted) {
            return res.status(404).json({ status: 'failure', message: 'User not found' });
        }
        return res.status(200).json({ status: 'success' });
    } catch (error) {
        return res.status(500).json({ status: 'failure', message: error });
    }
}

