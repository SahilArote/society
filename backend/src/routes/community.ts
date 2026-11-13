import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { uploadVisitorPhoto, isValidImageBuffer } from '../middleware/upload';
import { uploadVisitorPhoto as uploadToStorage } from '../services/photoStorageService';
import {
  getLostFoundItems,
  getLostFoundItemById,
  createLostFoundItem,
  updateLostFoundStatus,
  deleteLostFoundItem,
  getSocietyEvents,
  getSocietyEventById,
  registerForEvent,
  cancelEventRegistration,
  createSocietyEvent,
  updateSocietyEvent,
  deleteSocietyEvent,
  findFlatByResidentId,
} from '../database/db';

const router = Router();

// =============================================================
// A. LOST & FOUND MODULE
// =============================================================

// GET /api/resident/community/lost-found
router.get(
  '/lost-found',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN', 'GUARD'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const { type, status, search } = req.query;

      const items = await getLostFoundItems(societyId, {
        type: type ? String(type) : undefined,
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined,
      });

      return res.json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error fetching lost & found items:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch lost & found posts' },
      });
    }
  }
);

// GET /api/resident/community/lost-found/:id
router.get(
  '/lost-found/:id',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN', 'GUARD'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const { id } = req.params;

      const item = await getLostFoundItemById(id, societyId);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Item post not found' },
        });
      }

      return res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error fetching item detail:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch item detail' },
      });
    }
  }
);

// POST /api/resident/community/lost-found (Create item with optional photo upload)
router.post(
  '/lost-found',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN', 'GUARD'),
  uploadVisitorPhoto.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const authorId = req.user!.id;
      const authorName = req.user!.name || 'Resident';
      const authorPhone = req.user!.mobile;

      // Resolve author flat
      let authorFlat = 'Flat Member';
      try {
        const flat = await findFlatByResidentId(authorId);
        if (flat) {
          authorFlat = `Flat ${flat.wing ? flat.wing + '-' : ''}${flat.flatNumber}`;
        }
      } catch (_) {}

      const { type, title, description, category, location, incidentDate, imageUrl: rawImageUrl } = req.body;

      if (!type || !['LOST', 'FOUND'].includes(String(type).toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Type must be either LOST or FOUND' },
        });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Item title is required' },
        });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Detailed description is required' },
        });
      }

      if (!category || !category.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Category is required' },
        });
      }

      if (!location || !location.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Location is required' },
        });
      }

      let imageUrl = rawImageUrl ? String(rawImageUrl).trim() : undefined;

      // Handle file upload if present
      if (req.file) {
        if (!isValidImageBuffer(req.file.buffer)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_IMAGE', message: 'Uploaded file is not a valid image' },
          });
        }

        const uploaded = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
        imageUrl = uploaded.photoUrl;
      }

      const item = await createLostFoundItem({
        societyId,
        authorId,
        authorName,
        authorFlat,
        authorPhone,
        type: String(type).toUpperCase() as 'LOST' | 'FOUND',
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        location: location.trim(),
        incidentDate,
        imageUrl,
      });

      return res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: item,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error creating lost & found item:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to create post' },
      });
    }
  }
);

// PATCH /api/resident/community/lost-found/:id/status (Mark as RESOLVED or CLOSED)
router.patch(
  '/lost-found/:id/status',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const authorId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['ACTIVE', 'RESOLVED', 'CLOSED'].includes(String(status).toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Status must be ACTIVE, RESOLVED, or CLOSED' },
        });
      }

      const updated = await updateLostFoundStatus(
        id,
        societyId,
        authorId,
        String(status).toUpperCase() as 'ACTIVE' | 'RESOLVED' | 'CLOSED',
        isAdmin
      );

      if (!updated) {
        return res.status(403).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'You are not authorized to update this post' },
        });
      }

      return res.json({
        success: true,
        message: `Post status updated to ${status}`,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error updating item status:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to update post status' },
      });
    }
  }
);

// DELETE /api/resident/community/lost-found/:id
router.delete(
  '/lost-found/:id',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const authorId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { id } = req.params;

      const deleted = await deleteLostFoundItem(id, societyId, authorId, isAdmin);
      if (!deleted) {
        return res.status(403).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'You are not authorized to delete this post' },
        });
      }

      return res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error deleting post:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to delete post' },
      });
    }
  }
);

// =============================================================
// B. EVENTS MODULE
// =============================================================

// GET /api/resident/community/events (upcoming | past | all)
router.get(
  '/events',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN', 'GUARD'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const userId = req.user?.id;
      const { filter } = req.query;

      const events = await getSocietyEvents(
        societyId,
        (filter as 'upcoming' | 'past' | 'all') || 'upcoming',
        userId
      );

      return res.json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error fetching events:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch events' },
      });
    }
  }
);

// GET /api/resident/community/events/:id
router.get(
  '/events/:id',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN', 'GUARD'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const userId = req.user?.id;
      const { id } = req.params;

      const event = await getSocietyEventById(id, societyId, userId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
        });
      }

      return res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error fetching event detail:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch event detail' },
      });
    }
  }
);

// POST /api/resident/community/events/:id/register (Register / RSVP)
router.post(
  '/events/:id/register',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const userId = req.user!.id;
      const userName = req.user!.name || 'Resident';
      const userPhone = req.user!.mobile;
      const { id: eventId } = req.params;
      const guestCount = Math.max(1, parseInt(req.body.guestCount || '1', 10));

      let userFlat = 'Resident Flat';
      try {
        const flat = await findFlatByResidentId(userId);
        if (flat) {
          userFlat = `Flat ${flat.wing ? flat.wing + '-' : ''}${flat.flatNumber}`;
        }
      } catch (_) {}

      const result = await registerForEvent(
        eventId,
        {
          id: userId,
          name: userName,
          flat: userFlat,
          phone: userPhone,
          societyId,
        },
        guestCount
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'REGISTRATION_FAILED', message: result.error || 'Failed to register for event' },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Successfully registered for event',
        data: result.registration,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error registering for event:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to register for event' },
      });
    }
  }
);

// POST /api/resident/community/events/:id/cancel (Cancel registration)
router.post(
  '/events/:id/cancel',
  authenticateToken,
  authorizeRoles('RESIDENT', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id: eventId } = req.params;

      const cancelled = await cancelEventRegistration(eventId, userId);
      if (!cancelled) {
        return res.status(400).json({
          success: false,
          error: { code: 'CANCEL_FAILED', message: 'No active registration found to cancel' },
        });
      }

      return res.json({
        success: true,
        message: 'Registration cancelled successfully',
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error cancelling registration:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to cancel registration' },
      });
    }
  }
);

// POST /api/resident/community/events (Admin creation)
router.post(
  '/events',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const createdBy = req.user!.id;
      const { title, description, category, eventDate, endDate, timeStr, venue, organizer, coverImage, capacity } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Event title is required' },
        });
      }

      if (!eventDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Event date is required' },
        });
      }

      if (!venue || !venue.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Event venue is required' },
        });
      }

      const event = await createSocietyEvent({
        societyId,
        createdBy,
        title: title.trim(),
        description: description ? description.trim() : '',
        category: category ? category.trim() : 'Celebration',
        eventDate,
        endDate,
        timeStr: timeStr ? timeStr.trim() : '10:00 AM',
        venue: venue.trim(),
        organizer: organizer ? organizer.trim() : 'Society Committee',
        coverImage,
        capacity: capacity ? parseInt(capacity, 10) : 0,
      });

      return res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event,
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error creating event:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to create event' },
      });
    }
  }
);


// DELETE /api/resident/community/events/:id (Admin delete event)
router.delete(
  '/events/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_01';
      const { id } = req.params;
      const deleted = await deleteSocietyEvent(id, societyId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
        });
      }
      return res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error: any) {
      console.error('[COMMUNITY API] Error deleting event:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to delete event' },
      });
    }
  }
);

export default router;

