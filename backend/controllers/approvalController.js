// controllers/approvalController.js
const Approval = require('../models/Approval');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const ApprovalController = {
  async listPending(req, res) {
    const role = req.user.role;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Pending approvals requested', { userId: user_id, role });

    try {
      const approvals = await Approval.findPendingByRole(role);
      
      const duration = Date.now() - startTime;
      logger.performance('APPROVAL_LIST_PENDING', duration, {
        userId: user_id,
        role,
        approvalCount: approvals.length
      });

      res.json(approvals);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'approval_list_pending',
        userId: user_id,
        role,
        duration
      });
      res.status(500).json({ message: 'Failed to fetch approvals' });
    }
  },

  async act(req, res) {
    const { id } = req.params; // approval id
    const { status, comment } = req.body; // approved / rejected
    const user_id = req.user.user_id;
    const user_role = req.user.role;
    const startTime = Date.now();

    logger.info('Approval action attempted', { 
      userId: user_id, 
      role: user_role, 
      approvalId: id, 
      status 
    });

    if (!['approved', 'rejected'].includes(status)) {
      logger.warn('Invalid approval status', {
        userId: user_id,
        approvalId: id,
        invalidStatus: status
      });
      return res.status(400).json({ message: 'Invalid status' });
    }

    try {
      // Get approval details before acting
      const approvalDetails = await Approval.findById(id);
      if (!approvalDetails) {
        logger.warn('Approval not found', {
          userId: user_id,
          approvalId: id
        });
        return res.status(404).json({ message: 'Approval not found' });
      }

      const approval = await Approval.act({ approval_id: id, user_id, status, comment });

      // Get booking details for audit
      const booking = await Booking.findById(approval.booking_id);

      // Audit logging for approval action
      await AuditLog.create({
        user_id,
        action: 'APPROVAL_ACTION',
        entity_type: 'approval',
        entity_id: id,
        metadata: {
          approval_step: approvalDetails.step,
          approval_role: approvalDetails.role,
          previous_status: approvalDetails.status,
          new_status: status,
          comment: comment || null,
          booking_id: approval.booking_id,
          booking_title: booking?.title,
          booking_lob: booking?.lob,
          booking_purpose: booking?.purpose,
          approver_role: user_role,
          is_final_approval: approval.is_final || false
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      // if this was the last pending step, auto-update booking status
      const allDone = await Approval.areAllApproved(approval.booking_id);
      if (allDone && status === 'approved') {
        await Booking.updateStatus(approval.booking_id, 'approved');
        
        // Audit logging for booking status auto-update
        await AuditLog.create({
          user_id,
          action: 'BOOKING_AUTO_APPROVED',
          entity_type: 'booking',
          entity_id: approval.booking_id,
          metadata: {
            booking_title: booking?.title,
            booking_lob: booking?.lob,
            approval_chain_complete: true,
            final_approver: user_id,
            final_approver_role: user_role
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }
      
      if (status === 'rejected') {
        await Booking.updateStatus(approval.booking_id, 'rejected');
        
        // Audit logging for booking rejection
        await AuditLog.create({
          user_id,
          action: 'BOOKING_REJECTED',
          entity_type: 'booking',
          entity_id: approval.booking_id,
          metadata: {
            booking_title: booking?.title,
            booking_lob: booking?.lob,
            rejection_reason: comment,
            rejected_by: user_id,
            rejected_by_role: user_role
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }

      // Invalidate cache for bookings list after approval action
      if (req.app.locals.responseCache) {
        const cache = req.app.locals.responseCache;
        for (const [key] of cache) {
          if (key.includes('/api/bookings')) {
            cache.delete(key);
            logger.info('Cache invalidated after approval action', { key });
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.performance('APPROVAL_ACTION', duration, {
        approvalId: id,
        userId: user_id,
        status
      });

      logger.info('Approval action completed', {
        userId: user_id,
        approvalId: id,
        status,
        bookingId: approval.booking_id
      });

      res.json(approval);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'approval_action',
        userId: user_id,
        approvalId: id,
        status,
        duration
      });
      res.status(500).json({ message: 'Failed to act on approval' });
    }
  }
};

module.exports = ApprovalController; 