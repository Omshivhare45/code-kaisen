import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set Authorization header for all API calls
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Load current user on app load if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data.data);
      } catch (err) {
        console.error('Failed to load user session', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  // Register User
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/auth/register', userData);
      const { token: userToken, user: newUser } = res.data;
      localStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(newUser);
      return { success: true };
    } catch (err) {
      let errMsg = 'Unable to register.';
      if (err.response?.data) {
        if (err.response.data.message) {
          errMsg = err.response.data.message;
          if (Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
            errMsg += `: ${err.response.data.errors.join(', ')}`;
          }
        } else if (err.response.data.error) {
          errMsg = typeof err.response.data.error === 'string'
            ? err.response.data.error
            : (err.response.data.error.message || errMsg);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Login User
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token: userToken, user: newUser } = res.data;
      localStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(newUser);
      return { success: true };
    } catch (err) {
      let errMsg = 'Invalid credentials';
      if (err.response?.data) {
        if (err.response.data.message) {
          errMsg = err.response.data.message;
          if (Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
            errMsg += `: ${err.response.data.errors.join(', ')}`;
          }
        } else if (err.response.data.error) {
          errMsg = typeof err.response.data.error === 'string'
            ? err.response.data.error
            : (err.response.data.error.message || errMsg);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  // Update Profile
  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put('/api/auth/profile', profileData);
      setUser(res.data.data);
      return { success: true };
    } catch (err) {
      let errMsg = 'Failed to update profile';
      if (err.response?.data) {
        if (err.response.data.message) {
          errMsg = err.response.data.message;
          if (Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
            errMsg += `: ${err.response.data.errors.join(', ')}`;
          }
        } else if (err.response.data.error) {
          errMsg = typeof err.response.data.error === 'string'
            ? err.response.data.error
            : (err.response.data.error.message || errMsg);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      return { success: false, error: errMsg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        register,
        login,
        logout,
        updateProfile,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
