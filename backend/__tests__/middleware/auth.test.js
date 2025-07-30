// __tests__/middleware/auth.test.js
const authMiddleware = require('../../modules/shared/middleware/auth');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = jest.fn(); // Create a proper mock function
  });

  it('should authenticate valid token', () => {
    // Arrange
    const mockUser = { user_id: 1, email: 'test@example.com', role: 'user' };
    const token = 'valid.jwt.token';

    req.headers.authorization = `Bearer ${token}`;
    jwt.verify.mockReturnValue(mockUser);

    // Act
    authMiddleware(req, res, next);

    // Assert
    expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET || 'your-secret-key');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when no token provided', () => {
    // Arrange
    req.headers.authorization = undefined;

    // Act
    authMiddleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing or invalid Authorization header'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token format is invalid', () => {
    // Arrange
    req.headers.authorization = 'InvalidToken';

    // Act
    authMiddleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing or invalid Authorization header'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    // Arrange
    req.headers.authorization = 'Bearer invalid.token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    // Act
    authMiddleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle jwt verification errors gracefully', () => {
    // Arrange
    req.headers.authorization = 'Bearer valid.token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Token expired');
    });

    // Act
    authMiddleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid token'
    });
    expect(next).not.toHaveBeenCalled();
  });
}); 