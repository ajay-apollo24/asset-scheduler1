// src/components/UserManagement.js
import { useState } from 'react';
import apiClient from '../api/apiClient';

const UserManagement = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('requestor');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await apiClient.post('/users', { email, password, role });
      setMessage('User created');
    } catch {
      setMessage('Failed to create user');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">Create User</h2>
      <div className="mb-3">
        <label className="block text-sm mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-3 py-2 rounded" />
      </div>
      <div className="mb-3">
        <label className="block text-sm mb-1">Password</label>
        <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} className="w-full border px-3 py-2 rounded" />
      </div>
      <div className="mb-3">
        <label className="block text-sm mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border px-3 py-2 rounded">
          <option value="requestor">Requestor</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {message && <p className="text-sm text-blue-600">{message}</p>}
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded mt-2">Submit</button>
    </form>
  );
};

export default UserManagement;