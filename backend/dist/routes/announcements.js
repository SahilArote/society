"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../database/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/announcements
router.get('/', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const societyId = req.user?.societyId || 'soc_greengate';
    const announcements = db.announcements
        .filter((a) => a.societyId === societyId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({
        success: true,
        data: announcements,
    });
});
// POST /api/announcements
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), (req, res) => {
    const { title, body, priority, target } = req.body;
    if (!title || !body) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Title and content body are required' },
        });
    }
    const db = (0, db_1.getDb)();
    const societyId = req.user?.societyId || 'soc_greengate';
    const now = new Date().toISOString();
    const newAnnouncement = {
        id: `ann_${(0, uuid_1.v4)().slice(0, 8)}`,
        societyId,
        title: title.trim(),
        body: body.trim(),
        priority: priority || 'normal',
        target: target || 'all',
        createdBy: req.user.id,
        createdAt: now,
    };
    db.announcements.unshift(newAnnouncement);
    (0, db_1.saveDb)();
    return res.status(201).json({
        success: true,
        data: newAnnouncement,
    });
});
exports.default = router;
