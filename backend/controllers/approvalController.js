// controllers/approvalController.js
const Approval = require('../models/Approval');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

const ApprovalController = {
  async listPending(req, res) {
    const role = req.user.role;
    try {
      const approvals = await Approval.findPendingByRole(role);
      res.json(approvals);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to fetch approvals' });
    }
  },

  async act(req, res) {
    const { id } = req.params; // approval id
    const { status, comment } = req.body; // approved / rejected
    const user_id = req.user.user_id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    try {
      const approval = await Approval.act({ approval_id: id, user_id, status, comment });

      // if this was the last pending step, auto-update booking status
      const allDone = await Approval.areAllApproved(approval.booking_id);
      if (allDone && status === 'approved') {
        await Booking.updateStatus(approval.booking_id, 'approved');
      }
      if (status === 'rejected') {
        await Booking.updateStatus(approval.booking_id, 'rejected');
      }

      res.json(approval);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to act on approval' });
    }
  }
};

module.exports = ApprovalController; 