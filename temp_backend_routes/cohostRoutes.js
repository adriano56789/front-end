"use strict";
// CoHost API — estilo Tencent Cloud CoHostStore
// Conexão de co-host para PK battles e live conjunta
const express = require("express");
const router = express.Router();
const { getDb } = require("../config/db");

const COLLECTION = "cohostsessions";
const CANDIDATES_COLLECTION = "users";

// Criar sessão de co-host
router.post("/cohost/create", async (req, res) => {
    try {
        const { hostId, streamId } = req.body;
        if (!hostId || !streamId) {
            return res.status(400).json({ error: "hostId and streamId are required" });
        }
        const db = getDb();
        const session = {
            hostId,
            streamId,
            status: "waiting",
            coHostId: null,
            isMuted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await db.collection(COLLECTION).insertOne(session);
        res.json({ success: true, sessionId: result.insertedId, session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Solicitar conexão de co-host
router.put("/cohost/request", async (req, res) => {
    try {
        const { sessionId, coHostId } = req.body;
        if (!sessionId || !coHostId) {
            return res.status(400).json({ error: "sessionId and coHostId are required" });
        }
        const db = getDb();
        const result = await db.collection(COLLECTION).findOneAndUpdate(
            { _id: require("mongodb").ObjectId(sessionId) },
            { $set: { coHostId, status: "pending", updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!result) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({ success: true, session: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Aceitar conexão de co-host
router.put("/cohost/accept", async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: "sessionId is required" });
        }
        const db = getDb();
        const result = await db.collection(COLLECTION).findOneAndUpdate(
            { _id: require("mongodb").ObjectId(sessionId) },
            { $set: { status: "connected", updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!result) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({ success: true, session: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rejeitar conexão de co-host
router.put("/cohost/reject", async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: "sessionId is required" });
        }
        const db = getDb();
        const result = await db.collection(COLLECTION).findOneAndUpdate(
            { _id: require("mongodb").ObjectId(sessionId) },
            { $set: { status: "rejected", coHostId: null, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!result) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({ success: true, session: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sair da conexão de co-host
router.put("/cohost/exit", async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: "sessionId is required" });
        }
        const db = getDb();
        await db.collection(COLLECTION).findOneAndUpdate(
            { _id: require("mongodb").ObjectId(sessionId) },
            { $set: { status: "disconnected", updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mute/unmute remote host audio
router.put("/cohost/mute", async (req, res) => {
    try {
        const { sessionId, muted } = req.body;
        if (!sessionId || typeof muted !== "boolean") {
            return res.status(400).json({ error: "sessionId and muted (boolean) required" });
        }
        const db = getDb();
        const result = await db.collection(COLLECTION).findOneAndUpdate(
            { _id: require("mongodb").ObjectId(sessionId) },
            { $set: { isMuted: muted, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!result) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({ success: true, session: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar sessões ativas de um host
router.get("/cohost/sessions/:hostId", async (req, res) => {
    try {
        const db = getDb();
        const sessions = await db.collection(COLLECTION)
            .find({ hostId: req.params.hostId, status: { $in: ["waiting", "pending", "connected"] } })
            .sort({ createdAt: -1 })
            .toArray();
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar sessão
router.delete("/cohost/:sessionId", async (req, res) => {
    try {
        const db = getDb();
        await db.collection(COLLECTION).deleteOne({ _id: require("mongodb").ObjectId(req.params.sessionId) });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
