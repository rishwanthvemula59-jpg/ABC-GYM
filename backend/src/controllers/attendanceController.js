import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';
import { getIO } from '../config/socket.js';
import { v4 as uuidv4 } from 'uuid';
import { getDaysRemaining } from '../utils/dateUtils.js';

export async function qrCheckin(req, res, next) {
  try {
    const { phone, gymId } = req.validatedData;

    const { data: member } = await supabase.from('members').select('*').eq('phone', phone).eq('gym_id', gymId).eq('is_active', true).maybeSingle();
    if (!member) return res.status(404).json({ success: false, status: 'not_found', message: 'Not registered or profile deactivated' });

    const today = new Date().toISOString().split('T')[0];
    const daysRemaining = getDaysRemaining(member.expiry_date);

    let status;
    if (daysRemaining <= 0) status = 'expired';
    else if (daysRemaining <= 5) status = 'expiring';
    else status = 'active';

    const { data: todayAttendance } = await supabase.from('attendance').select('*').eq('member_id', member.id).eq('check_in_date', today).maybeSingle();

    if (todayAttendance) {
      return res.status(400).json({
        success: false,
        status: 'already_checked_in',
        error: 'You have already checked in today. Please return tomorrow!'
      });
    }

    if (status === 'expired') {
      return res.status(400).json({
        success: false,
        status: 'expired',
        error: 'YOUR PLAN HAS BEEN EXPIRED PLEASE CONTACT THE OWNER'
      });
    }

    await supabase.from('attendance').insert({
      id: uuidv4(),
      gym_id: gymId,
      member_id: member.id,
      check_in_date: today,
      marked_by: 'self'
    });

    const io = getIO();
    io.to(`gym_${gymId}`).emit('attendance_update', { memberId: member.id, status: 'checked_in', timestamp: new Date() });

    res.json({
      success: true,
      status,
      message: status === 'active' ? 'Welcome!' : 'Check subscription',
      member: { id: member.id, name: member.full_name, daysRemaining, alreadyCheckedIn: !!todayAttendance }
    });
  } catch (err) {
    next(err);
  }
}

export async function markPresent(req, res, next) {
  try {
    const { gymId } = req.params;
    const { memberId } = req.validatedData;
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const { data: existing } = await supabase.from('attendance').select('*').eq('member_id', memberId).eq('check_in_date', today).maybeSingle();
    if (existing) return res.status(400).json({ success: false, error: 'Already checked in today' });

    // Validate member exists and is active and belongs to this gym
    const { data: member } = await supabase.from('members').select('*').eq('id', memberId).eq('gym_id', gymId).eq('is_active', true).maybeSingle();
    if (!member) return res.status(404).json({ success: false, error: 'Member not found or deactivated' });

    // Compare date strings directly to avoid timezone issues (expiry_date is YYYY-MM-DD)
    if (member.expiry_date < today) {
      return res.status(400).json({ success: false, error: 'Member subscription has expired. Please renew first.' });
    }

    await supabase.from('attendance').insert({
      id: uuidv4(),
      gym_id: gymId,
      member_id: memberId,
      check_in_date: today,
      marked_by: 'admin'
    });

    const io = getIO();
    io.to(`gym_${gymId}`).emit('attendance_update', { memberId, status: 'checked_in', markedBy: 'admin', timestamp: new Date() });

    res.json({ success: true, message: 'Marked present' });
  } catch (err) {
    next(err);
  }
}

export async function getTodayAttendance(req, res, next) {
  try {
    const { gymId } = req.params;
    const { date, search } = req.query;

    const { data: members, error: mErr } = await supabase.from('members').select('*').eq('gym_id', gymId).eq('is_active', true);
    if (mErr) throw mErr;

    let query = supabase.from('attendance').select('*').eq('gym_id', gymId);

    if (date && date !== 'all') {
      query = query.eq('check_in_date', date);
    } else if (!date) {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('check_in_date', today);
    }

    const { data: attendance, error: aErr } = await query;
    if (aErr) throw aErr;

    const membersMap = new Map();
    members?.forEach(m => membersMap.set(m.id, m));

    const activeCheckins = (attendance || []).filter(att => membersMap.has(att.member_id));
    const checkedInIds = new Set(activeCheckins.map(a => a.member_id));

    let records = activeCheckins.map(att => {
      const member = membersMap.get(att.member_id);
      const dateObj = new Date(att.created_at || att.check_in_date);
      const timeStr = dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

      return {
        id: att.id,
        memberId: att.member_id,
        time: timeStr,
        date: att.check_in_date,
        name: member.full_name,
        phone: member.phone,
        expiryDate: member.expiry_date,
        markedBy: att.marked_by,
        timestamp: dateObj.getTime()
      };
    });

    // Sort logs so the most recent is displayed first
    records.sort((a, b) => b.timestamp - a.timestamp);

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(search)
      );
    }

    res.json({
      success: true,
      stats: {
        checkedIn: checkedInIds.size,
        total: members?.length || 0,
        percentage: members?.length ? Math.min(Math.round((checkedInIds.size / members.length) * 100), 100) : 0
      },
      records
    });
  } catch (err) {
    next(err);
  }
}