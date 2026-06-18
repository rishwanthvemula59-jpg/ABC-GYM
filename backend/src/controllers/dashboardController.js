import supabase from '../config/supabase.js';
import { getDaysRemaining } from '../utils/dateUtils.js';

export async function getDashboardData(req, res, next) {
  try {
    const { gymId } = req.params; // activeId
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Fetch all members (both active and expired/expiring)
    const { data: members, error: membersErr } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true);

    if (membersErr) throw membersErr;

    const totalMembers = members?.length || 0;

    // 2. Fetch today's attendance
    const { data: todayAttendance, error: attErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .eq('check_in_date', todayStr);

    if (attErr) throw attErr;

    // Count unique check-ins today
    const uniqueCheckedInIds = new Set((todayAttendance || []).map(a => a.member_id).filter(Boolean));
    const todayCheckinsCount = uniqueCheckedInIds.size;

    // 3. Calculate expiring soon (0 to 5 days remaining) and active/expired
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let activeCount = 0;

    const membersMap = new Map();
    members?.forEach(m => {
      membersMap.set(m.id, m);
      const days = getDaysRemaining(m.expiry_date);
      if (days <= 0) expiredCount++;
      else if (days <= 5) expiringSoonCount++;
      else activeCount++;
    });

    // 4. Calculate Monthly Revenue (sum of members' payments who started within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const revenueMembers = members?.filter(m => m.start_date >= thirtyDaysAgo) || [];
    const monthlyRevenue = revenueMembers.reduce((sum, m) => sum + Number(m.plan_price || 0), 0);

    // 5. Recent Check-ins
    // Fetch check-ins for today only
    const { data: recentAtt, error: recentErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .eq('check_in_date', todayStr)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recentErr) throw recentErr;

    const recentCheckins = (recentAtt || []).map(att => {
      const member = membersMap.get(att.member_id) || { full_name: 'Unknown Member', expiry_date: todayStr };
      const days = getDaysRemaining(member.expiry_date);
      let status = 'active';
      if (days <= 0) status = 'expired';
      else if (days <= 5) status = 'expiring';

      // Format time
      const dateObj = new Date(att.created_at || att.check_in_date);
      const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      return {
        id: att.id,
        time: timeStr,
        name: member.full_name,
        status,
        memberId: att.member_id
      };
    });

    // 6. Weekly Attendance (last 7 days counts in a single query)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: weeklyAttRecords, error: weeklyErr } = await supabase
      .from('attendance')
      .select('check_in_date')
      .eq('gym_id', gymId)
      .gte('check_in_date', sevenDaysAgoStr);

    if (weeklyErr) throw weeklyErr;

    const countsMap = {};
    weeklyAttRecords?.forEach(r => {
      const dateStr = r.check_in_date;
      countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
    });

    const weeklyAttendance = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      weeklyAttendance.push({
        day: dayName,
        count: countsMap[dStr] || 0
      });
    }

    res.json({
      success: true,
      stats: {
        totalMembers,
        todayCheckins: todayCheckinsCount,
        expiringSoon: expiringSoonCount,
        expired: expiredCount,
        monthlyRevenue: monthlyRevenue ? `₹${(monthlyRevenue / 1000).toFixed(0)}K` : '₹0K'
      },
      recentCheckins,
      weeklyAttendance
    });
  } catch (err) {
    next(err);
  }
}
