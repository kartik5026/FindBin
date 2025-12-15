import mongoose from 'mongoose';
import { DustbinModel, DustbinRequestModel } from '../model';

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseLatLng(query: any) {
  const lat = parseNumber(query?.lat);
  const lng = parseNumber(query?.lng);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  return { lat, lng };
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

export async function listDustbins(req: any, res: any) {
  try {
    const dustbins = await DustbinModel.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ status: 'success', dustbins });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function nearestDustbin(req: any, res: any) {
  try {
    const coords = parseLatLng(req.query);
    if (!coords) {
      return res
        .status(400)
        .json({ status: 'failure', message: 'Invalid lat/lng query params' });
    }

    // If there are no dustbins yet, return an "empty success" so the frontend doesn't treat it as an error.
    const count = await DustbinModel.estimatedDocumentCount();
    if (count === 0) {
      return res.status(200).json({
        status: 'success',
        dustbin: null,
        distanceMeters: null,
        message: 'No dustbins found yet',
      });
    }

    let results: any[] = [];
    try {
      results = await DustbinModel.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [coords.lng, coords.lat] },
            distanceField: 'distanceMeters',
            spherical: true,
          },
        },
        { $limit: 1 },
      ]);
    } catch (geoError: any) {
      // Common if the geo index isn't built yet. Fallback to JS distance on all dustbins.
      const msg = String(geoError?.message ?? geoError);
      console.error('geoNear failed, falling back to JS nearest:', msg);

      const all = await DustbinModel.find({}).lean();
      let best: any | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const d of all) {
        const lat = d?.location?.coordinates?.[1];
        const lng = d?.location?.coordinates?.[0];
        if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) continue;
        const dist = haversineMeters(coords, { lat, lng });
        if (dist < bestDist) {
          bestDist = dist;
          best = { ...d, distanceMeters: dist };
        }
      }
      if (!best) {
        return res.status(200).json({
          status: 'success',
          dustbin: null,
          distanceMeters: null,
          message: 'No dustbins found yet',
        });
      }
      return res.status(200).json({
        status: 'success',
        dustbin: best,
        distanceMeters: bestDist,
        fallback: true,
      });
    }

    if (!results.length) {
      return res.status(200).json({
        status: 'success',
        dustbin: null,
        distanceMeters: null,
        message: 'No dustbins found yet',
      });
    }

    const dustbin = results[0];
    return res.status(200).json({
      status: 'success',
      dustbin,
      distanceMeters: dustbin.distanceMeters,
    });
  } catch (error) {
    // Common when the collection doesn't exist yet or geo index isn't ready; treat as "no data" instead of 500.
    const msg = String((error as any)?.message ?? error);
    if (msg.toLowerCase().includes('ns not found') || msg.toLowerCase().includes('namespace not found')) {
      return res.status(200).json({
        status: 'success',
        dustbin: null,
        distanceMeters: null,
        message: 'No dustbins found yet',
      });
    }
    console.error('nearestDustbin error:', msg);
    return res.status(500).json({ status: 'failure', message: msg });
  }
}

export async function createDustbinRequest(req: any, res: any) {
  try {
    const lat = parseNumber(req.body?.lat);
    const lng = parseNumber(req.body?.lng);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ status: 'failure', message: 'Invalid lat/lng' });
    }

    const created = await DustbinRequestModel.create({
      address: req.body?.address,
      note: req.body?.note,
      createdByEmail: req.body?.email,
      location: { type: 'Point', coordinates: [lng, lat] },
    });

    return res.status(201).json({ status: 'success', request: created });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function listDustbinRequestsAdmin(req: any, res: any) {
  try {
    const status = req.query?.status;
    const filter: any = {};
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      filter.status = status;
    }

    const requests = await DustbinRequestModel.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ status: 'success', requests });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function approveDustbinRequestAdmin(req: any, res: any) {
  try {
    const requestId = req.params?.id;
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ status: 'failure', message: 'Invalid request id' });
    }

    const request = await DustbinRequestModel.findById(requestId);
    if (!request) {
      return res.status(404).json({ status: 'failure', message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ status: 'failure', message: 'Request already processed' });
    }

    const dustbin = await DustbinModel.create({
      name: req.body?.name ?? 'Dustbin',
      address: request.address,
      location: request.location,
      createdByUserId: req.user?.id,
    });

    request.status = 'approved';
    request.dustbinId = dustbin._id;
    request.approvedByUserId = req.user?.id;
    await request.save();

    return res.status(200).json({ status: 'success', request, dustbin });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function rejectDustbinRequestAdmin(req: any, res: any) {
  try {
    const requestId = req.params?.id;
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ status: 'failure', message: 'Invalid request id' });
    }

    const request = await DustbinRequestModel.findById(requestId);
    if (!request) {
      return res.status(404).json({ status: 'failure', message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ status: 'failure', message: 'Request already processed' });
    }

    request.status = 'rejected';
    request.approvedByUserId = req.user?.id;
    await request.save();

    return res.status(200).json({ status: 'success', request });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function createDustbinAdmin(req: any, res: any) {
  try {
    const lat = parseNumber(req.body?.lat);
    const lng = parseNumber(req.body?.lng);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ status: 'failure', message: 'Invalid lat/lng' });
    }
    const name = req.body?.name;
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ status: 'failure', message: 'Name is required' });
    }

    const dustbin = await DustbinModel.create({
      name,
      address: req.body?.address,
      location: { type: 'Point', coordinates: [lng, lat] },
      createdByUserId: req.user?.id,
    });

    return res.status(201).json({ status: 'success', dustbin });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function updateDustbinAdmin(req: any, res: any) {
  try {
    const id = req.params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'failure', message: 'Invalid dustbin id' });
    }

    const update: any = {};
    if (typeof req.body?.name === 'string') update.name = req.body.name;
    if (typeof req.body?.address === 'string') update.address = req.body.address;

    const lat = parseNumber(req.body?.lat);
    const lng = parseNumber(req.body?.lng);
    if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ status: 'failure', message: 'Invalid lat/lng' });
      }
      update.location = { type: 'Point', coordinates: [lng, lat] };
    }

    const dustbin = await DustbinModel.findByIdAndUpdate(id, update, { new: true });
    if (!dustbin) {
      return res.status(404).json({ status: 'failure', message: 'Dustbin not found' });
    }
    return res.status(200).json({ status: 'success', dustbin });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}

export async function deleteDustbinAdmin(req: any, res: any) {
  try {
    const id = req.params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'failure', message: 'Invalid dustbin id' });
    }

    const dustbin = await DustbinModel.findByIdAndDelete(id);
    if (!dustbin) {
      return res.status(404).json({ status: 'failure', message: 'Dustbin not found' });
    }
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    return res.status(500).json({ status: 'failure', message: error });
  }
}


