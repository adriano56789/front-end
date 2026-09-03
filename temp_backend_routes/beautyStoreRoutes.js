"use strict";
// Beauty Store API — estilo Tencent Cloud BaseBeautyStore
// Singleton por usuário: setSmooth, setWhiten, setRuddy, reset
const express = require("express");
const router = express.Router();
const { getDb } = require("../config/db");

const COLLECTION = "beautysettings";
const PROJECTION = { userId: 1, settings: 1, _id: 0 };

const DEFAULTS = {
    "Branquear": 42,
    "Alisar a pele": 40,
    "Ruborizar": 32,
    "Contraste": 18,
    "Balanço de Branco": 48,
    "Rosto Bebê": 38,
    "Clarear dentes": 24,
    "Suavizar rugas": 45,
    "Clarear olheiras": 35,
    "Remover manchas": 70,
    "Reduzir brilho": 28,
    "Nitidez": 60,
    "Efeito 3D": 50,
    "Limpar Chiado": 70,
    "Suavização do rosto": 35
};

async function getSettings(userId) {
    const db = getDb();
    const col = db.collection(COLLECTION);
    const result = await col.findOne({ userId }, { projection: { settings: 1, _id: 0 } });
    return result?.settings || { ...DEFAULTS };
}

async function upsertSettings(userId, settings) {
    const db = getDb();
    const col = db.collection(COLLECTION);
    return col.findOneAndUpdate(
        { userId },
        { $set: { settings }, $currentDate: { updatedAt: true } },
        { upsert: true, returnDocument: "after", projection: PROJECTION }
    );
}

// GET /api/beauty-store/:userId — BaseBeautyStore.shared equivalent
router.get("/beauty-store/:userId", async (req, res) => {
    try {
        const settings = await getSettings(req.params.userId);
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/smooth — setSmoothLevel(level)
router.put("/beauty-store/:userId/smooth", async (req, res) => {
    try {
        const { level } = req.body;
        if (typeof level !== "number" || level < 0 || level > 100) {
            return res.status(400).json({ error: "Level must be 0-100" });
        }
        const s = await getSettings(req.params.userId);
        s["Alisar a pele"] = level;
        s["Suavização do rosto"] = level;
        const saved = await upsertSettings(req.params.userId, s);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/whiten — setWhitenessLevel(level)
router.put("/beauty-store/:userId/whiten", async (req, res) => {
    try {
        const { level } = req.body;
        if (typeof level !== "number" || level < 0 || level > 100) {
            return res.status(400).json({ error: "Level must be 0-100" });
        }
        const s = await getSettings(req.params.userId);
        s["Branquear"] = level;
        const saved = await upsertSettings(req.params.userId, s);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/ruddy — setRuddyLevel(level)
router.put("/beauty-store/:userId/ruddy", async (req, res) => {
    try {
        const { level } = req.body;
        if (typeof level !== "number" || level < 0 || level > 100) {
            return res.status(400).json({ error: "Level must be 0-100" });
        }
        const s = await getSettings(req.params.userId);
        s["Ruborizar"] = level;
        const saved = await upsertSettings(req.params.userId, s);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/denoise — Limpar Chiado
router.put("/beauty-store/:userId/denoise", async (req, res) => {
    try {
        const { level } = req.body;
        if (typeof level !== "number" || level < 0 || level > 100) {
            return res.status(400).json({ error: "Level must be 0-100" });
        }
        const s = await getSettings(req.params.userId);
        s["Limpar Chiado"] = level;
        const saved = await upsertSettings(req.params.userId, s);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/sharpness — Nitidez
router.put("/beauty-store/:userId/sharpness", async (req, res) => {
    try {
        const { level } = req.body;
        if (typeof level !== "number" || level < 0 || level > 100) {
            return res.status(400).json({ error: "Level must be 0-100" });
        }
        const s = await getSettings(req.params.userId);
        s["Nitidez"] = level;
        const saved = await upsertSettings(req.params.userId, s);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/reset — reset all to defaults
router.put("/beauty-store/:userId/reset", async (req, res) => {
    try {
        const saved = await upsertSettings(req.params.userId, { ...DEFAULTS });
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/beauty-store/:userId/all — update multiple fields at once
router.put("/beauty-store/:userId/all", async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings) {
            return res.status(400).json({ error: "Settings are required" });
        }
        const current = await getSettings(req.params.userId);
        const merged = { ...current, ...settings };
        const saved = await upsertSettings(req.params.userId, merged);
        res.json({ success: true, settings: saved.settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
