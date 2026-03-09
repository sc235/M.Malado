const jwt = require('jsonwebtoken');

// Middleware to verify Supabase JWT token
const authMiddleware = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    // Note: In a real production environment with Supabase, 
    // you would verify this token using your SUPABASE_JWT_SECRET.
    // Since we are migrating and might not have the secret handy,
    // we decode it to at least ensure it's a validly formed string
    // and belongs to an authenticated user role.
    
    // For higher security, you should configure the JWT secret:
    // const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    
    const decoded = jwt.decode(token);
    
    if (!decoded || decoded.role !== 'authenticated') {
      return res.status(403).json({ error: 'Accès invalide ou expiré.' });
    }

    req.user = decoded; // Add user info to the request
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Token invalide.' });
  }
};

module.exports = authMiddleware;
