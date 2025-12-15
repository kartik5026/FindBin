import {
    adminCreateUser,
    adminDeleteUser,
    adminListUsers,
    adminUpdateUser,
    createUser,
    getAllUsers,
    loginUser,
} from "../repository";

export async function createUserService(req:any,res:any){
    createUser(req,res);
}

export async function getAllUsersService(req:any,res:any){
    getAllUsers(req,res);
}

export async function loginUserService(req:any,res:any){
    loginUser(req,res)
}

export async function adminListUsersService(req: any, res: any) {
    return adminListUsers(req, res);
}

export async function adminCreateUserService(req: any, res: any) {
    return adminCreateUser(req, res);
}

export async function adminUpdateUserService(req: any, res: any) {
    return adminUpdateUser(req, res);
}

export async function adminDeleteUserService(req: any, res: any) {
    return adminDeleteUser(req, res);
}