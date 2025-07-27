// __tests__/middleware/authorize.test.js
const authorize = require('../../middleware/authorize');

describe('Authorize Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = jest.fn(); // Create a proper mock function
  });

  it('should allow access for authorized role', () => {
    // Arrange
    req.user = { user_id: 1, role: 'admin' };
    const authorizeAdmin = authorize('admin');

    // Act
    authorizeAdmin(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow access for multiple authorized roles', () => {
    // Arrange
    req.user = { user_id: 1, role: 'user' };
    const authorizeUserOrAdmin = authorize('user', 'admin');

    // Act
    authorizeUserOrAdmin(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should deny access for unauthorized role', () => {
    // Arrange
    req.user = { user_id: 1, role: 'user' };
    const authorizeAdmin = authorize('admin');

    // Act
    authorizeAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny access when user has no role', () => {
    // Arrange
    req.user = { user_id: 1 };
    const authorizeAdmin = authorize('admin');

    // Act
    authorizeAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny access when no user object', () => {
    // Arrange
    req.user = undefined;
    const authorizeAdmin = authorize('admin');

    // Act
    authorizeAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unauthenticated'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle empty roles array', () => {
    // Arrange
    req.user = { user_id: 1, role: 'admin' };
    const authorizeNone = authorize();

    // Act
    authorizeNone(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow access for wildcard role', () => {
    // Arrange
    req.user = { user_id: 1, role: 'any_role' };
    const authorizeWildcard = authorize('*');

    // Act
    authorizeWildcard(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
}); 