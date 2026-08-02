import { Router, Request, Response } from 'express';

const router = Router();

router.post('/forward', (req: Request, res: Response) => {
  const p = req.body;
  if (!p || p.action !== 'on_forward') {
    res.status(400).json({ code: 1, data: { urls: [] } });
    return;
  }
  const dests = (process.env.SRS_FORWARD_DESTINATIONS || '').split(/\s+/).map(s => s.trim()).filter(Boolean);
  if (!dests.length) {
    res.json({ code: 0, data: { urls: [] } });
    return;
  }
  const { app, stream } = p;
  const urls = dests.map(d => /^rtmp:/.test(d) ? d : `rtmp://${d}:1935/${app || 'live'}/${stream}`);
  res.json({ code: 0, data: { urls } });
});

export default router;
