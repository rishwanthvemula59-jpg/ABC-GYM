import supabase from '../config/supabase.js';
import { generateToken, generateRefreshToken, hashPassword, comparePassword, verifyRefreshToken } from '../utils/cryptoUtils.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { sendSMS } from '../utils/twilio.js';

export async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone } = req.validatedData;

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.status(400).json({ success: false, error: 'Email exists' });

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    const { data: userData, error: userError } = await supabase.from('users').insert({
      id: userId, email, password_hash: passwordHash, first_name: firstName, last_name: lastName, phone, is_active: true
    }).select().maybeSingle();

    if (userError) throw userError;

    const gymId = uuidv4();
    await supabase.from('gyms').insert({ id: gymId, owner_id: userId, gym_name: `${firstName}'s Gym`, owner_phone: phone });
    await supabase.from('gym_settings').insert({ gym_id: gymId });

    logger.info(`✅ User registered: ${email}`);
    res.status(201).json({ success: true, message: 'Registered', user: { id: userData.id, email: userData.email } });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.validatedData;

    const { data: userList, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},phone.eq.${identifier}`)
      .eq('is_active', true)
      .order('email', { ascending: true })
      .limit(1);

    const userData = userList?.[0];
    if (userError || !userData) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const passwordMatch = await comparePassword(password, userData.password_hash);
    if (!passwordMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const { data: gymData } = await supabase.from('gyms').select('id').eq('owner_id', userData.id).limit(1).maybeSingle();
    const gymId = gymData?.id;

    const accessToken = generateToken({ userId: userData.id, email: userData.email, gymId });
    const refreshToken = generateRefreshToken({ userId: userData.id });

    const sessionId = uuidv4();
    await supabase.from('sessions').insert({
      id: sessionId,
      user_id: userData.id,
      gym_id: gymId,
      token: accessToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', userData.id);

    logger.info(`✅ Login: ${identifier}`);
    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: userData.id, email: userData.email, firstName: userData.first_name, gymId }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await supabase.from('sessions').delete().eq('token', req.token);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const { data: user } = await supabase.from('users').select('id, email, first_name, last_name, phone, created_at').eq('id', req.userId).maybeSingle();
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.validatedData;
    const decoded = verifyRefreshToken(token);

    const { data: gym } = await supabase.from('gyms').select('id').eq('owner_id', decoded.userId).limit(1).maybeSingle();
    const newAccessToken = generateToken({ userId: decoded.userId, gymId: gym?.id });

    // Create a new session row for this refreshed access token so authMiddleware will accept it
    const sessionId = uuidv4();
    await supabase.from('sessions').insert({
      id: sessionId,
      user_id: decoded.userId,
      gym_id: gym?.id,
      token: newAccessToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { identifier } = req.validatedData;

    const { data: userList, error } = await supabase
      .from('users')
      .select('id, email, phone, first_name, role')
      .or(`email.eq.${identifier},phone.eq.${identifier}`);

    if (error || !userList || userList.length === 0) {
      return res.json({ success: true, message: 'If that identifier exists, an OTP has been sent.' });
    }

    const hasOwner = userList.some(u => u.role === 'owner');
    let targetPhone = userList[0].phone;
    if (hasOwner) {
      targetPhone = '6281042207';
    }

    if (!targetPhone) {
      return res.status(400).json({ success: false, error: 'User does not have a registered phone number.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const userIds = userList.map(u => u.id);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_otp: otp,
        reset_otp_expires_at: expiresAt
      })
      .in('id', userIds);

    if (updateError) throw updateError;

    const message = `Hi ${userList[0].first_name || 'there'}! Your password reset OTP for ABC Fitness Studio is ${otp}. It expires in 10 minutes.`;
    await sendSMS(targetPhone, message);

    logger.info(`🔑 OTP generated and sent to ${userList[0].email} (${targetPhone}) | OTP CODE: ${otp}`);
    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { identifier, otp, newPassword } = req.validatedData;

    const { data: userList, error } = await supabase
      .from('users')
      .select('id, reset_otp, reset_otp_expires_at')
      .or(`email.eq.${identifier},phone.eq.${identifier}`);

    if (error || !userList || userList.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid credentials or expired OTP.' });
    }

    const validUsers = userList.filter(u => {
      if (!u.reset_otp || u.reset_otp !== otp) return false;
      const expiresAt = new Date(u.reset_otp_expires_at);
      return expiresAt >= new Date();
    });

    if (validUsers.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid credentials or expired OTP.' });
    }

    const newPasswordHash = await hashPassword(newPassword);
    const validUserIds = validUsers.map(u => u.id);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        reset_otp: null,
        reset_otp_expires_at: null
      })
      .in('id', validUserIds);

    if (updateError) throw updateError;

    logger.info(`🔑 Password successfully reset for user ${identifier}`);
    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}