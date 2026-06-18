import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';
import { getIO } from '../config/socket.js';
import { v4 as uuidv4 } from 'uuid';
import { PLANS } from '../utils/constants.js';
import { addDays } from '../utils/dateUtils.js';

export async function createMember(req, res, next) {
  try {
    const { gymId } = req.params;
    const { fullName, phone, email, plan, paymentStatus, notes, customDays } = req.validatedData;

    const { data: existing } = await supabase.from('members').select('id').eq('gym_id', gymId).eq('phone', phone).maybeSingle();
    if (existing) return res.status(400).json({ success: false, error: 'Member exists' });

    const planData = plan === '1_month' ? PLANS.ONE_MONTH : PLANS.THREE_MONTH;
    const days = (customDays !== undefined && customDays !== null) ? parseInt(customDays, 10) : planData.days;
    const price = (customDays !== undefined && customDays !== null) ? Math.round((planData.price / planData.days) * days) : planData.price;
    const startDate = new Date();
    const expiryDate = addDays(startDate, days);
    const memberId = uuidv4();

    const { data: member, error } = await supabase.from('members').insert({
      id: memberId,
      gym_id: gymId,
      full_name: fullName,
      phone,
      email,
      plan,
      plan_price: price,
      start_date: startDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      payment_status: paymentStatus,
      payment_date: paymentStatus === 'paid' ? new Date().toISOString() : null,
      notes,
      is_active: true
    }).select().maybeSingle();

    if (error) throw error;

    await supabase.from('achievements').insert({ member_id: memberId, achievement_type: 'starter' });

    const io = getIO();
    io.to(`gym_${gymId}`).emit('member_created', { member, timestamp: new Date() });

    logger.info(`✅ Member created: ${fullName}`);
    res.status(201).json({ success: true, message: 'Created', member });
  } catch (err) {
    next(err);
  }
}

export async function listMembers(req, res, next) {
  try {
    const { gymId } = req.params;
    const { status = 'all', search, limit = 20, offset = 0 } = req.validatedQuery;

    let query = supabase.from('members').select('*', { count: 'exact' }).eq('gym_id', gymId);

    const todayStr = new Date().toISOString().split('T')[0];
    if (status === 'active') {
      query = query.eq('is_active', true).gt('expiry_date', todayStr);
    } else if (status === 'expiring') {
      const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      query = query.eq('is_active', true).lte('expiry_date', fiveDaysLater).gt('expiry_date', todayStr);
    } else if (status === 'expired') {
      query = query.eq('is_active', true).lte('expiry_date', todayStr);
    } else if (status === 'deactivated') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: members, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, total: count, limit, offset, members });
  } catch (err) {
    next(err);
  }
}

export async function getMember(req, res, next) {
  try {
    const { gymId, memberId } = req.params;
    const { data: member, error } = await supabase.from('members').select('*').eq('id', memberId).eq('gym_id', gymId).maybeSingle();
    if (error || !member) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
}

export async function renewMembership(req, res, next) {
  try {
    const { gymId, memberId } = req.params;
    const { plan, paymentStatus, customDays } = req.validatedData;

    const planData = plan === '1_month' ? PLANS.ONE_MONTH : PLANS.THREE_MONTH;
    const days = (customDays !== undefined && customDays !== null) ? parseInt(customDays, 10) : planData.days;
    const price = (customDays !== undefined && customDays !== null) ? Math.round((planData.price / planData.days) * days) : planData.price;
    const now = new Date();
    const newExpiryDate = addDays(now, days);

    const { data: member, error } = await supabase.from('members').update({
      plan,
      plan_price: price,
      expiry_date: newExpiryDate.toISOString().split('T')[0],
      payment_status: paymentStatus,
      payment_date: paymentStatus === 'paid' ? now.toISOString() : null,
      status: 'active'
    }).eq('id', memberId).eq('gym_id', gymId).select().maybeSingle();

    if (error || !member) return res.status(404).json({ success: false, error: 'Not found' });

    const io = getIO();
    io.to(`gym_${gymId}`).emit('membership_renewed', { member, timestamp: new Date() });

    res.json({ success: true, message: 'Renewed', member });
  } catch (err) {
    next(err);
  }
}

export async function deleteMember(req, res, next) {
  try {
    const { gymId, memberId } = req.params;
    const { data: member, error } = await supabase.from('members').delete().eq('id', memberId).eq('gym_id', gymId).select().maybeSingle();

    if (error || !member) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, message: 'Member deleted successfully', member });
  } catch (err) {
    next(err);
  }
}

export async function toggleMemberStatus(req, res, next) {
  try {
    const { gymId, memberId } = req.params;
    const { is_active } = req.body;

    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .eq('gym_id', gymId)
      .maybeSingle();

    if (fetchError || !member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const nextActive = (is_active !== undefined) ? is_active : !member.is_active;

    const { data: updated, error } = await supabase
      .from('members')
      .update({ is_active: nextActive })
      .eq('id', memberId)
      .eq('gym_id', gymId)
      .select()
      .maybeSingle();

    if (error) throw error;

    res.json({ success: true, message: `Member status updated to ${nextActive ? 'active' : 'deactivated'}`, member: updated });
  } catch (err) {
    next(err);
  }
}