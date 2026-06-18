import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function sendRenewalReminder(req, res, next) {
  try {
    const { gymId } = req.params;
    const { memberId } = req.validatedData;

    const { data: member } = await supabase.from('members').select('*').eq('id', memberId).eq('gym_id', gymId).maybeSingle();
    if (!member) return res.status(404).json({ success: false, error: 'Not found' });

    logger.info(`📱 Renewal reminder: ${member.full_name}`);

    await supabase.from('message_logs').insert({
      id: uuidv4(),
      gym_id: gymId,
      member_id: memberId,
      message_type: 'renewal_reminder',
      status: 'sent',
      phone_number: member.phone
    });

    res.json({ success: true, message: 'Reminder sent' });
  } catch (err) {
    next(err);
  }
}

export async function sendExpiredAlert(req, res, next) {
  try {
    const { gymId } = req.params;
    const { memberId } = req.validatedData;

    const { data: member } = await supabase.from('members').select('*').eq('id', memberId).eq('gym_id', gymId).maybeSingle();
    if (!member) return res.status(404).json({ success: false, error: 'Not found' });

    logger.info(`📱 Expired alert: ${member.full_name}`);

    await supabase.from('message_logs').insert({
      id: uuidv4(),
      gym_id: gymId,
      member_id: memberId,
      message_type: 'expired_alert',
      status: 'sent',
      phone_number: member.phone
    });

    res.json({ success: true, message: 'Alert sent' });
  } catch (err) {
    next(err);
  }
}