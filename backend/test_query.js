import supabase from '/Users/rishwanthvemula/Downloads/gym-management-system/gym-management-system/backend/src/validators/ABC/backend/src/config/supabase.js';

async function testQuery() {
  const identifier = '6281042207';
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, phone, first_name, role')
    .or(`email.eq.${identifier},phone.eq.${identifier}`)
    .maybeSingle();
  console.log('User found:', user);
  console.log('Error:', error);
}

testQuery();
