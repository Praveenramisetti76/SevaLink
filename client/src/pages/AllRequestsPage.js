import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  FunnelIcon,
  HeartIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';

const AllRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sortBy: 'newest'
  });



  useEffect(() => {
    fetchRequests();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/requests?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        showError('Error', 'Failed to fetch requests');
        setRequests([]);
      }
    } catch (error) {
      showError('Error', 'Network error while fetching requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      blood: HeartIcon,
      elder_support: UserGroupIcon,
      complaint: ExclamationTriangleIcon
    };
    return icons[type] || ClockIcon;
  };

  const getTypeColor = (type) => {
    const colors = {
      blood: 'bg-red-100 text-red-600',
      elder_support: 'bg-green-100 text-green-600',
      complaint: 'bg-orange-100 text-orange-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[urgency] || 'text-gray-600';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        showLoading('Deleting request...');

        const response = await fetch(`/api/requests/${requestId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setRequests(prev => prev.filter(req => req._id !== requestId));
          closeLoading();
          showSuccess('Success', 'Request deleted successfully');
        } else {
          const data = await response.json();
          closeLoading();
          showError('Error', data.message || 'Failed to delete request');
        }
      } catch (error) {
        closeLoading();
        showError('Error', 'Network error while deleting request');
      }
    }
  };

  const RequestCard = ({ request }) => {
    const Icon = getTypeIcon(request.type);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`p-3 rounded-lg ${getTypeColor(request.type)}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{request.title}</h3>
              <p className="text-gray-300 text-sm line-clamp-2 mb-3">{request.description}</p>

              {/* Type-specific details */}
              <div className="space-y-1 text-sm text-gray-400">
                {request.type === 'blood' && (
                  <>
                    <p>Blood Type: <span className="font-medium text-red-600">{request.bloodType}</span></p>
                    <p>Urgency: <span className={`font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                      {request.urgencyLevel.toUpperCase()}
                    </span></p>
                  </>
                )}
                {request.type === 'elder_support' && (
                  <>
                    <p>Service: <span className="font-medium">{request.serviceType}</span></p>
                    <p>Due: <span className="font-medium">{formatDate(request.dueDate)}</span></p>
                  </>
                )}
                {request.type === 'complaint' && (
                  <p>Category: <span className="font-medium">{request.category}</span></p>
                )}
                <p>Location: <span className="font-medium">
                  {typeof request.location === 'object' ? request.location.address : request.location}
                </span></p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div className="text-sm text-gray-400">
            <p>Created: {formatDate(request.createdAt)}</p>
            {request.updatedAt !== request.createdAt && (
              <p>Updated: {formatDate(request.updatedAt)}</p>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => {/* View details */}}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
              title="View Details"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {request.status === 'pending' && (
              <button
                onClick={() => {/* Edit request */}}
                className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                title="Edit Request"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDeleteRequest(request._id)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Delete Request"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              My Requests
            </h1>
            <p className="text-gray-300">Track and manage all your requests</p>
          </div>

          <button
            onClick={() => navigate('/dashboard/add-request')}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Request</span>
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-300" />
            <h3 className="text-lg font-semibold text-white">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="" className="text-gray-900">All Types</option>
              <option value="blood" className="text-gray-900">Blood Request</option>
              <option value="elder_support" className="text-gray-900">Elder Support</option>
              <option value="complaint" className="text-gray-900">Complaint</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="" className="text-gray-900">All Status</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="in_progress" className="text-gray-900">In Progress</option>
              <option value="resolved" className="text-gray-900">Resolved</option>
              <option value="completed" className="text-gray-900">Completed</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest" className="text-gray-900">Newest First</option>
              <option value="oldest" className="text-gray-900">Oldest First</option>
              <option value="updated" className="text-gray-900">Recently Updated</option>
            </select>

            <button
              onClick={() => setFilters({ type: '', status: '', sortBy: 'newest' })}
              className="px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <AnimatePresence>
            {requests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

        {!loading && requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
            <p className="text-gray-300 mb-6">
              {Object.values(filters).some(f => f)
                ? "No requests match your current filters."
                : "You haven't created any requests yet."
              }
            </p>
            <button
              onClick={() => navigate('/dashboard/add-request')}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
            >
              Create Your First Request
            </button>
          </motion.div>
        )}
    </div>
  );
};

export default AllRequestsPage;
