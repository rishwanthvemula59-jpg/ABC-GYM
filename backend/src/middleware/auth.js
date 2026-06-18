import { verifyToken } from '../utils/cryptoUtils.js';
import logger from '../utils/logger.js';
import supabase from '../config/supabase.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const { data: sessionData, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !sessionData) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    await supabase
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionData.id);

    req.userId = decoded.userId;
    req.gymId = decoded.gymId;
    req.token = token;

    next();
  } catch (err) {
    logger.error('Auth error:', err);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export async function requireGym(req, res, next) {
  try {
    const { gymId } = req.params;

    const { data: gym, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gymId)
      .eq('owner_id', req.userId)
      .maybeSingle();

    if (error || !gym) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    req.gym = gym;
    next();
  } catch (err) {
    logger.error('requireGym error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}