import {
  approveDustbinRequestAdminService,
  createDustbinAdminService,
  createDustbinRequestService,
  deleteDustbinAdminService,
  listDustbinRequestsAdminService,
  listDustbinsService,
  nearestDustbinService,
  rejectDustbinRequestAdminService,
  updateDustbinAdminService,
} from '../services';

class LocationController {
  async listDustbinsController(req: any, res: any) {
    return listDustbinsService(req, res);
  }

  async nearestDustbinController(req: any, res: any) {
    return nearestDustbinService(req, res);
  }

  async createDustbinRequestController(req: any, res: any) {
    return createDustbinRequestService(req, res);
  }

  // admin
  async listDustbinRequestsAdminController(req: any, res: any) {
    return listDustbinRequestsAdminService(req, res);
  }

  async approveDustbinRequestAdminController(req: any, res: any) {
    return approveDustbinRequestAdminService(req, res);
  }

  async rejectDustbinRequestAdminController(req: any, res: any) {
    return rejectDustbinRequestAdminService(req, res);
  }

  async createDustbinAdminController(req: any, res: any) {
    return createDustbinAdminService(req, res);
  }

  async updateDustbinAdminController(req: any, res: any) {
    return updateDustbinAdminService(req, res);
  }

  async deleteDustbinAdminController(req: any, res: any) {
    return deleteDustbinAdminService(req, res);
  }
}

export default LocationController;


