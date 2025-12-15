import { Router } from "express";
import LocationController from "../controller";
import { requireAdmin } from "../../../middleware/auth";

export const locationRouter = Router();
const locationController = new LocationController();

const reverseCache = new Map<string, any>();

function parseNumber(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// public helper: reverse geocode a lat/lng into a human-friendly location name/address
locationRouter.get('/geocode/reverse', async (req: any, res: any) => {
  try {
    const lat = parseNumber(req.query?.lat);
    const lng = parseNumber(req.query?.lng);
    if (lat === undefined || lng === undefined || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ status: 'failure', message: 'Invalid lat/lng' });
    }

    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = reverseCache.get(key);
    if (cached) {
      return res.status(200).json({ status: 'success', ...cached, cached: true });
    }

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(String(lat))}` +
      `&lon=${encodeURIComponent(String(lng))}`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim strongly prefers a real User-Agent; in browser we proxy via server, so we can set a UA-like header.
        'Accept': 'application/json',
        'User-Agent': 'FindBin/1.0 (reverse-geocode)',
      },
    });
    clearTimeout(t);

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ status: 'failure', message: text || 'Reverse geocode failed' });
    }

    const data: any = await r.json();
    const payload = {
      displayName: data?.display_name ?? null,
      address: data?.address ?? null,
    };
    reverseCache.set(key, payload);
    return res.status(200).json({ status: 'success', ...payload });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    return res.status(500).json({ status: 'failure', message: msg });
  }
});

// public
locationRouter.get('/dustbins', locationController.listDustbinsController);
locationRouter.get('/dustbins/nearest', locationController.nearestDustbinController);
locationRouter.post('/dustbin-requests', locationController.createDustbinRequestController);

// admin (requires Bearer token from login)
locationRouter.get(
  '/admin/dustbin-requests',
  requireAdmin,
  locationController.listDustbinRequestsAdminController
);
locationRouter.post(
  '/admin/dustbin-requests/:id/approve',
  requireAdmin,
  locationController.approveDustbinRequestAdminController
);
locationRouter.post(
  '/admin/dustbin-requests/:id/reject',
  requireAdmin,
  locationController.rejectDustbinRequestAdminController
);

locationRouter.post('/admin/dustbins', requireAdmin, locationController.createDustbinAdminController);
locationRouter.put('/admin/dustbins/:id', requireAdmin, locationController.updateDustbinAdminController);
locationRouter.delete('/admin/dustbins/:id', requireAdmin, locationController.deleteDustbinAdminController);
locationRouter.get('/admin/dustbins', requireAdmin, locationController.listDustbinsController);