import {
    adminCreateUserService,
    adminDeleteUserService,
    adminListUsersService,
    adminUpdateUserService,
    createUserService,
    getAllUsersService,
    loginUserService
} from "../services";

class UserConroller{
    async  getAllUsersController(req:any,res:any){
        getAllUsersService(req,res)
    }

    async createUserController(req:any,res:any){
        createUserService(req, res);
    }

    async updateUserController(req:any,res:any){
        return adminUpdateUserService(req, res);
    }

    async deleteUserController(req:any,res:any){
        return adminDeleteUserService(req, res);
    }

    async loginUserController(req:any,res:any){
        loginUserService(req,res);
    }

    async adminListUsersController(req: any, res: any) {
        return adminListUsersService(req, res);
    }

    async adminCreateUserController(req: any, res: any) {
        return adminCreateUserService(req, res);
    }
}
export default UserConroller;