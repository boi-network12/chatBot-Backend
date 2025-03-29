const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Check for token in headers or cookies
  let token = req.header("Authorization") || req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: "Authorization token required" 
    });
  }

  // Remove 'Bearer ' if present
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length).trimLeft();
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: "Invalid or expired token" 
    });
  }
};

module.exports = authMiddleware;