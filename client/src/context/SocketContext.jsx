import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import apiClient from '../services/apiClient.js';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    // Connect to host (relative URL since Vite proxies in dev or uses domain root)
    const newSocket = io(window.location.origin || 'http://localhost:5000');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Join session once user details are loaded
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join_session', user);

    // Initial fetch of historical notifications
    fetchNotifications();

    // Listen to real-time notification events
    socket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Toast notification for instant popup feedback
      toast.info(
        <div>
          <p className="font-bold text-sm">{notification.title}</p>
          <p className="text-xs opacity-90">{notification.message}</p>
        </div>,
        {
          position: 'top-right',
          autoClose: 5000,
          theme: 'dark',
        }
      );
    });

    // Conflict Alert broadcast
    socket.on('conflict_alert', (data) => {
      toast.error(
        <div>
          <p className="font-bold text-sm">Excavation Conflict Alert!</p>
          <p className="text-xs opacity-90">{data.message}</p>
        </div>,
        {
          position: 'top-right',
          autoClose: 6000,
          theme: 'dark',
        }
      );
    });

    return () => {
      socket.off('notification');
      socket.off('conflict_alert');
    };
  }, [socket, user]);

  const fetchNotifications = async () => {
    try {
      // apiClient handles Authorization headers automatically
      const response = await apiClient.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.data.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      const response = await apiClient.put(`/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiClient.put('/notifications/read-all');
      if (response.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        markNotificationAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSockets = () => useContext(SocketContext);
export default SocketContext;
