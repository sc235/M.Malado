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
    // Verify using the Supabase JWT secret from environment variables
    const secret = process.env.SUPABASE_JWT_SECRET;
    
    if (!secret) {
      console.error("ERREUR CRITIQUE: SUPABASE_JWT_SECRET n'est pas défini dans .env");
      return res.status(500).json({ error: 'Configuration serveur invalide (Clé JWT manquante).' });
    }

    const decoded = jwt.verify(token, secret);
    
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
