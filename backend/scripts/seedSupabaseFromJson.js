import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import supabase from '../src/config/supabase.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '../src/config/db.json');

const isUuid = (str) => {
  if (!str) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

async function seed() {
  console.log('🚀 Starting Supabase Database Migration...');

  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ db.json file not found at: ${DB_FILE}`);
    process.exit(1);
  }

  const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // Clear existing database tables to prevent conflicts
  console.log('🧹 Clearing existing database tables...');
  const checkError = (name, error) => {
    if (error) console.error(`⚠️ Error clearing ${name}:`, error.message);
  };

  const { error: err1 } = await supabase.from('achievements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('achievements', err1);

  const { error: err2 } = await supabase.from('message_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('message_logs', err2);

  const { error: err3 } = await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('sessions', err3);

  const { error: err4 } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('attendance', err4);

  const { error: err5 } = await supabase.from('members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('members', err5);

  const { error: err6 } = await supabase.from('gym_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('gym_settings', err6);
  
  // Detach gym_id from users to allow deleting gyms
  const { error: err7 } = await supabase.from('users').update({ gym_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('users update', err7);

  const { error: err8 } = await supabase.from('gyms').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('gyms', err8);

  const { error: err9 } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  checkError('users delete', err9);

  // Deduplicate users by email and map IDs
  const users = dbData.users || [];
  const userMap = {}; // originalUserId -> keptUserId
  const uniqueUsers = [];
  const seenEmails = new Set();

  users.forEach(user => {
    const emailLower = user.email.toLowerCase().trim();
    const validId = isUuid(user.id) ? user.id : crypto.randomUUID();
    
    if (!seenEmails.has(emailLower)) {
      seenEmails.add(emailLower);
      const originalId = user.id;
      user.id = validId;
      uniqueUsers.push(user);
      userMap[originalId] = validId;
      userMap[validId] = validId;
    } else {
      const keptUser = uniqueUsers.find(u => u.email.toLowerCase().trim() === emailLower);
      userMap[user.id] = keptUser.id;
    }
  });

  // 1. Prepare users (set gym_id to null initially to satisfy foreign keys)
  if (uniqueUsers.length > 0) {
    console.log(`👤 Upserting ${uniqueUsers.length} unique users with null gym_id...`);
    const usersToInsert = uniqueUsers.map(user => ({
      id: user.id,
      email: user.email.toLowerCase().trim(),
      password_hash: user.password_hash,
      role: user.role || 'owner',
      full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      is_active: user.is_active !== false,
      last_login: user.last_login || null,
      gym_id: null // Null out temporarily
    }));

    const { error: usersErr } = await supabase.from('users').upsert(usersToInsert);
    if (usersErr) {
      console.error('❌ Error upserting users:', usersErr.message);
      process.exit(1);
    }
    console.log('✅ Users populated.');
  }

  // Deduplicate Gyms by ID and map owner_id
  const gyms = dbData.gyms || [];
  const uniqueGyms = [];
  const seenGymIds = new Set();

  gyms.forEach(gym => {
    const validGymId = isUuid(gym.id) ? gym.id : crypto.randomUUID();
    gym.id = validGymId;
    if (!seenGymIds.has(gym.id)) {
      seenGymIds.add(gym.id);
      gym.owner_id = userMap[gym.owner_id] || gym.owner_id;
      uniqueGyms.push(gym);
    }
  });

  // 2. Insert Gyms
  if (uniqueGyms.length > 0) {
    console.log(`🏋️ Upserting ${uniqueGyms.length} unique gyms...`);
    const gymsToInsert = uniqueGyms.map(gym => ({
      id: gym.id,
      owner_id: gym.owner_id || null,
      name: gym.name || gym.gym_name,
      gym_name: gym.gym_name,
      owner_name: gym.owner_name,
      owner_phone: gym.owner_phone,
      email: gym.email,
      phone: gym.phone,
      location: gym.location,
      logo_url: gym.logo_url
    }));

    const { error: gymsErr } = await supabase.from('gyms').upsert(gymsToInsert);
    if (gymsErr) {
      console.error('❌ Error upserting gyms:', gymsErr.message);
      process.exit(1);
    }
    console.log('✅ Gyms populated.');
  }

  // 3. Update users with correct gym_ids now that gyms exist
  if (uniqueUsers.length > 0) {
    console.log('👤 Updating users with correct gym_id associations...');
    const usersWithGymIds = uniqueUsers.filter(u => u.gym_id).map(user => ({
      id: user.id,
      email: user.email.toLowerCase().trim(),
      password_hash: user.password_hash,
      role: user.role || 'owner',
      full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      is_active: user.is_active !== false,
      last_login: user.last_login || null,
      gym_id: user.gym_id
    }));

    if (usersWithGymIds.length > 0) {
      const { error: updateErr } = await supabase.from('users').upsert(usersWithGymIds);
      if (updateErr) {
        console.error('❌ Error updating users gym_id:', updateErr.message);
        process.exit(1);
      }
      console.log('✅ User gym_id associations updated.');
    }
  }

  // 4. Insert Gym Settings
  const gymSettings = dbData.gym_settings || [];
  if (gymSettings.length > 0) {
    console.log(`⚙️ Upserting ${gymSettings.length} gym settings...`);
    const settingsToInsert = gymSettings.map(setting => ({
      id: isUuid(setting.id) ? setting.id : crypto.randomUUID(),
      gym_id: setting.gym_id,
      currency: setting.currency || 'INR',
      timezone: setting.timezone || 'Asia/Kolkata',
      whatsapp_enabled: !!setting.whatsapp_enabled,
      sms_enabled: !!setting.sms_enabled
    }));

    const { error: settingsErr } = await supabase.from('gym_settings').upsert(settingsToInsert);
    if (settingsErr) {
      console.error('❌ Error upserting gym settings:', settingsErr.message);
      process.exit(1);
    }
    console.log('✅ Gym settings populated.');
  }

  // Deduplicate Members by (gym_id, phone) to prevent unique constraint violations
  const members = dbData.members || [];
  const memberMap = {}; // originalMemberId -> keptMemberId
  const uniqueMembers = [];
  const seenMemberKeys = new Set();

  members.forEach(m => {
    const key = `${m.gym_id}_${m.phone.trim()}`;
    const validMemberId = isUuid(m.id) ? m.id : crypto.randomUUID();
    
    if (!seenMemberKeys.has(key)) {
      seenMemberKeys.add(key);
      const originalId = m.id;
      m.id = validMemberId;
      uniqueMembers.push(m);
      memberMap[originalId] = validMemberId;
      memberMap[validMemberId] = validMemberId;
    } else {
      const keptMember = uniqueMembers.find(um => `${um.gym_id}_${um.phone.trim()}` === key);
      memberMap[m.id] = keptMember.id;
    }
  });

  // 5. Insert Members
  if (uniqueMembers.length > 0) {
    console.log(`👥 Upserting ${uniqueMembers.length} unique members...`);
    const membersToInsert = uniqueMembers.map(m => ({
      id: m.id,
      gym_id: m.gym_id,
      full_name: m.full_name,
      email: m.email || null,
      phone: m.phone.trim(),
      joins_at: m.joins_at || null,
      start_date: m.start_date || m.joins_at || null,
      expiry_date: m.expiry_date,
      is_active: m.is_active !== false,
      status: m.status || 'active',
      plan_type: m.plan_type || m.plan || null,
      plan: m.plan || null,
      plan_price: m.plan_price || 0,
      payment_status: m.payment_status || 'pending',
      payment_date: m.payment_date || null,
      notes: m.notes || null
    }));

    const { error: membersErr } = await supabase.from('members').upsert(membersToInsert);
    if (membersErr) {
      console.error('❌ Error upserting members:', membersErr.message);
      process.exit(1);
    }
    console.log('✅ Members populated.');
  }

  // Deduplicate Attendance by (member_id, check_in_date) & filter out orphaned records
  const attendance = dbData.attendance || [];
  const uniqueAttendance = [];
  const seenAttendanceKeys = new Set();

  attendance.forEach(att => {
    const mappedMemberId = memberMap[att.member_id];
    if (!mappedMemberId) {
      // Skip orphaned attendance record referencing a non-existent member
      return;
    }
    const key = `${mappedMemberId}_${att.check_in_date}`;
    if (!seenAttendanceKeys.has(key)) {
      seenAttendanceKeys.add(key);
      att.member_id = mappedMemberId;
      uniqueAttendance.push(att);
    }
  });

  // 6. Insert Attendance
  if (uniqueAttendance.length > 0) {
    console.log(`📅 Upserting ${uniqueAttendance.length} unique attendance records...`);
    const attendanceToInsert = uniqueAttendance.map(att => ({
      id: isUuid(att.id) ? att.id : crypto.randomUUID(),
      gym_id: att.gym_id,
      member_id: att.member_id,
      check_in_date: att.check_in_date,
      created_at: att.created_at || new Date().toISOString(),
      marked_by: att.marked_by || 'admin'
    }));

    const { error: attErr } = await supabase.from('attendance').upsert(attendanceToInsert);
    if (attErr) {
      console.error('❌ Error upserting attendance:', attErr.message);
      process.exit(1);
    }
    console.log('✅ Attendance records populated.');
  }

  // 7. Insert Sessions (filter out orphaned sessions)
  const sessions = dbData.sessions || [];
  const validSessions = sessions.filter(s => userMap[s.user_id]);
  if (validSessions.length > 0) {
    console.log(`🔑 Upserting ${validSessions.length} sessions...`);
    const sessionsToInsert = validSessions.map(s => ({
      id: isUuid(s.id) ? s.id : crypto.randomUUID(),
      user_id: userMap[s.user_id],
      gym_id: s.gym_id,
      token: s.token,
      expires_at: s.expires_at,
      created_at: s.created_at || new Date().toISOString(),
      last_activity: s.last_activity || new Date().toISOString()
    }));

    const { error: sessErr } = await supabase.from('sessions').upsert(sessionsToInsert);
    if (sessErr) {
      console.error('❌ Error upserting sessions:', sessErr.message);
      process.exit(1);
    }
    console.log('✅ Sessions populated.');
  }

  // 8. Insert Achievements (filter out orphaned achievements)
  const achievements = dbData.achievements || [];
  const validAchievements = achievements.filter(ach => memberMap[ach.member_id]);
  if (validAchievements.length > 0) {
    console.log(`🏆 Upserting ${validAchievements.length} achievements...`);
    const achievementsToInsert = validAchievements.map(ach => ({
      id: isUuid(ach.id) ? ach.id : crypto.randomUUID(),
      member_id: memberMap[ach.member_id],
      achievement_type: ach.achievement_type,
      created_at: ach.created_at || new Date().toISOString()
    }));

    const { error: achErr } = await supabase.from('achievements').upsert(achievementsToInsert);
    if (achErr) {
      console.error('❌ Error upserting achievements:', achErr.message);
      process.exit(1);
    }
    console.log('✅ Achievements populated.');
  }

  // 9. Insert Message Logs (filter out orphaned logs)
  const messageLogs = dbData.message_logs || [];
  const validLogs = messageLogs.filter(log => memberMap[log.member_id]);
  if (validLogs.length > 0) {
    console.log(`💬 Upserting ${validLogs.length} message logs...`);
    const logsToInsert = validLogs.map(log => ({
      id: isUuid(log.id) ? log.id : crypto.randomUUID(),
      gym_id: log.gym_id,
      member_id: memberMap[log.member_id],
      message_type: log.message_type || 'renewal_reminder',
      status: log.status || 'sent',
      phone_number: log.phone_number || log.phone || '',
      created_at: log.created_at || log.sent_at || new Date().toISOString()
    }));

    const { error: logsErr } = await supabase.from('message_logs').upsert(logsToInsert);
    if (logsErr) {
      console.error('❌ Error upserting message logs:', logsErr.message);
      process.exit(1);
    }
    console.log('✅ Message logs populated.');
  }

  console.log('🎉 Supabase Database Migration Completed Successfully!');
}

seed().catch(err => {
  console.error('❌ Seed Script Exception:', err);
  process.exit(1);
});
