"use strict";
// API de Qualidade de Vídeo — resolução, denoise, nitidez, FPS, bitrate
// Segue o padrão EXATO do backend: Express Router + MongoDB generic via getDb()
const express = require("express");
const router = express.Router();
const { getDb } = require("../config/db");

const COLLECTION = "videoqualitysettings";
const PROJECTION = { userId: 1, settings: 1, createdAt: 1, updatedAt: 1, _id: 0 };

// Defaults para resolução limpa estilo TC Cloud
const DEFAULTS = {
    resolution: "1080p",
    frameRate: 30,
    bitrate: 2500,
    denoiseLevel: 70,
    sharpnessLevel: 60,
    whiteBalanceLevel: 48,
    faceVolume3D: 50,
    autoDenoise: true,
    encodingPreset: "quality",
    codec: "vp8"
};

async function upsertSettings(userId, settings) {
    const db = getDb();
    const col = db.collection(COLLECTION);
    return col.findOneAndUpdate(
        { userId },
        { $set: { settings, updatedAt: new Date() } },
        { upsert: true, returnDocument: "after", projection: PROJECTION }
    );
}

async function getSettings(userId) {
    const db = getDb();
    const col = db.collection(COLLECTION);
    const result = await col.findOne({ userId }, { projection: { settings: 1, _id: 0 } });
    return result?.settings || { ...DEFAULTS };
}

// GET /api/video-quality/:userId
router.get("/video-quality/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const settings = await getSettings(userId);
        res.json(settings);
    } catch (error) {
        console.error("❌ [VIDEO_QUALITY] GET error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/video-quality/:userId
router.post("/video-quality/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { settings } = req.body;
        if (!settings) {
            return res.status(400).json({ error: "Settings are required" });
        }
        const merged = { ...DEFAULTS, ...settings };
        const saved = await upsertSettings(userId, merged);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        console.error("❌ [VIDEO_QUALITY] POST error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/video-quality/:userId/denoise — set denoise level direto
router.put("/video-quality/:userId/denoise", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { level } = req.body;
        if (typeof level !== "number" || level < 0 || level > 100) {
            return res.status(400).json({ error: "Level must be 0-100" });
        }
        const current = await getSettings(userId);
        current.denoiseLevel = level;
        const saved = await upsertSettings(userId, current);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/video-quality/:userId/resolution — set resolution direto
router.put("/video-quality/:userId/resolution", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { resolution } = req.body;
        const valid = ["1080p", "720p", "480p", "360p", "auto"];
        if (!valid.includes(resolution)) {
            return res.status(400).json({ error: "Invalid resolution" });
        }
        const current = await getSettings(userId);
        current.resolution = resolution;
        const saved = await upsertSettings(userId, current);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/video-quality/:userId/reset — resetar para defaults
router.put("/video-quality/:userId/reset", async (req, res) => {
    try {
        const userId = req.params.userId;
        const saved = await upsertSettings(userId, { ...DEFAULTS });
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
