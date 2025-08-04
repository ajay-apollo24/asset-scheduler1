// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}));

// Mock axios
jest.mock('./api/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock AuthContext
const mockAuth = {
  user: { id: 1, email: 'test@example.com', roles: [] },
  hasPermission: () => true,
  isPlatformAdmin: () => false,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => mockAuth
}));
