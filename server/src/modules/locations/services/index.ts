import {
  approveDustbinRequestAdmin,
  createDustbinAdmin,
  createDustbinRequest,
  deleteDustbinAdmin,
  listDustbinRequestsAdmin,
  listDustbins,
  nearestDustbin,
  rejectDustbinRequestAdmin,
  updateDustbinAdmin,
} from '../repository';

export async function listDustbinsService(req: any, res: any) {
  return listDustbins(req, res);
}

export async function nearestDustbinService(req: any, res: any) {
  return nearestDustbin(req, res);
}

export async function createDustbinRequestService(req: any, res: any) {
  return createDustbinRequest(req, res);
}

export async function listDustbinRequestsAdminService(req: any, res: any) {
  return listDustbinRequestsAdmin(req, res);
}

export async function approveDustbinRequestAdminService(req: any, res: any) {
  return approveDustbinRequestAdmin(req, res);
}

export async function rejectDustbinRequestAdminService(req: any, res: any) {
  return rejectDustbinRequestAdmin(req, res);
}

export async function createDustbinAdminService(req: any, res: any) {
  return createDustbinAdmin(req, res);
}

export async function updateDustbinAdminService(req: any, res: any) {
  return updateDustbinAdmin(req, res);
}

export async function deleteDustbinAdminService(req: any, res: any) {
  return deleteDustbinAdmin(req, res);
}


