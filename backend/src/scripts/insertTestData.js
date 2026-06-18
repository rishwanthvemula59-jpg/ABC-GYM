import supabase from '../config/supabase.js';
import { hashPassword } from '../utils/cryptoUtils.js';
import { v4 as uuidv4 } from 'uuid';

async function insertTestData() {
  try {
    console.log('🚀 Inserting test data...');

    const userId = uuidv4();
    const userPassword = await hashPassword('Test@1234');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: 'owner@abcfitness.com',
        password_hash: userPassword,
        first_name: 'Rajesh',
        last_name: 'Kumar',
        phone: '9876543210',
        is_active: true
      })
      .select()
      .single();

    if (userError) throw userError;
    console.log('✅ User created: owner@abcfitness.com');

    // Create owner@gym.com for compatibility
    try {
      await supabase.from('users').insert({
        id: uuidv4(),
        email: 'owner@gym.com',
        password_hash: userPassword,
        first_name: 'Rajesh',
        last_name: 'Kumar',
        phone: '9876543210',
        is_active: true
      });
      console.log('✅ User created: owner@gym.com');
    } catch (e) {
      // Ignore if exists
    }

    const gymId = '60916a67-7d4a-4c44-bb6a-d74c54354a81'; // Fixed ID for consistency
    // Try to delete existing gym settings/members if they exist for clean slate
    try {
      await supabase.from('gym_settings').delete().eq('gym_id', gymId);
      await supabase.from('members').delete().eq('gym_id', gymId);
    } catch (e) {}

    const { data: gymData, error: gymError } = await supabase
      .from('gyms')
      .insert({
        id: gymId,
        owner_id: userId,
        gym_name: 'ABC Fitness Studio',
        owner_phone: '9876543210'
      })
      .select()
      .single();

    if (gymError) throw gymError;
    console.log('✅ Studio created: ABC Fitness Studio');

    await supabase.from('gym_settings').insert({ gym_id: gymId });

    const membersData = [
      { full_name: 'Rahul Sharma', phone: '9876543211', email: 'rahul@gmail.com', plan: '3_month', plan_price: 2000, expiry_days: 45 },
      { full_name: 'Priya Reddy', phone: '9876543212', email: 'priya@gmail.com', plan: '1_month', plan_price: 750, expiry_days: 3 },
      { full_name: 'Vikram Singh', phone: '9876543213', email: 'vikram@gmail.com', plan: '3_month', plan_price: 2000, expiry_days: 65 },
      { full_name: 'Neha Gupta', phone: '9876543214', email: 'neha@gmail.com', plan: '1_month', plan_price: 750, expiry_days: -5 },
      { full_name: 'Anil Kumar', phone: '9876543215', email: 'anil@gmail.com', plan: '1_month', plan_price: 750, expiry_days: 20 }
    ];

    for (const memberData of membersData) {
      const memberId = uuidv4();
      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + memberData.expiry_days);

      const { data: member } = await supabase.from('members').insert({
        id: memberId,
        gym_id: gymId,
        full_name: memberData.full_name,
        phone: memberData.phone,
        email: memberData.email,
        plan: memberData.plan,
        plan_price: memberData.plan_price,
        start_date: today.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        payment_status: 'paid',
        is_active: true
      }).select().single();

      await supabase.from('achievements').insert({ member_id: memberId, achievement_type: 'starter' });

      for (let i = 0; i < 5; i++) {
        const checkInDate = new Date(today);
        checkInDate.setDate(checkInDate.getDate() - i);
        await supabase.from('attendance').insert({
          gym_id: gymId,
          member_id: memberId,
          check_in_date: checkInDate.toISOString().split('T')[0],
          marked_by: 'self'
        });
      }

      console.log(`✅ Member: ${memberData.full_name}`);
    }

    console.log('\n✅ Test data complete!');
    console.log('\nLogin option 1: owner@abcfitness.com / Test@1234');
    console.log('Login option 2: owner@gym.com / Test@1234');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

insertTestData();