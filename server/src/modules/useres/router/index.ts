import { Router } from "express";
import UserConroller from "../controller";
import { requireAdmin } from "../../../middleware/auth";
const userController = new UserConroller();
export const userRouter = Router();

// Make listing users admin-only (avoids leaking user data publicly)
userRouter.get('/', requireAdmin, userController.getAllUsersController)
userRouter.post('/create-user', userController.createUserController);
userRouter.post('/login-user',userController.loginUserController);

// admin user management (recommended paths)
userRouter.get('/admin/users', requireAdmin, userController.adminListUsersController);
userRouter.post('/admin/users', requireAdmin, userController.adminCreateUserController);
userRouter.put('/admin/users/:id', requireAdmin, userController.updateUserController);
userRouter.delete('/admin/users/:id', requireAdmin, userController.deleteUserController);

// legacy endpoints (keep, but protect)
userRouter.delete('/delete-user', requireAdmin, userController.deleteUserController)
userRouter.put('/update-user', requireAdmin, userController.updateUserController)
