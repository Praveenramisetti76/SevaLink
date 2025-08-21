import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import FormInput from '../components/ui/FormInput';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: typeof user?.address === 'object' ?
      `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() :
      user?.address || ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSave = async () => {
    try {
      showLoading('Updating profile...');

      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));

      closeLoading();
      showSuccess('Success', 'Profile updated successfully');
      setIsEditing(false);

      // Update user context if needed
      if (updateUser) {
        updateUser(formData);
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: typeof user?.address === 'object' ?
        `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() :
        user?.address || ''
    });
    setErrors({});
    setIsEditing(false);
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Profile</h1>
            <p className="text-gray-300">Manage your account information</p>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
            >
              <PencilIcon className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8"
        >
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-600 capitalize">{user?.role}</p>
            <p className="text-sm text-gray-500">Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Full Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                error={errors.name}
                icon={UserIcon}
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                error={errors.email}
                icon={EnvelopeIcon}
              />

              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                error={errors.phone}
                icon={PhoneIcon}
              />

              <FormInput
                label="Address"
                name="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter your address"
                error={errors.address}
                icon={MapPinIcon}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <UserIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{user?.name || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <EnvelopeIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user?.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <PhoneIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-900">{user?.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <MapPinIcon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium text-gray-900">
                  {typeof user?.address === 'object' ?
                    `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() || 'Not provided' :
                    user?.address || 'Not provided'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Account Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-600">Total Requests</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">0</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>
        </motion.div>
    </div>
  );
};

export default ProfilePage;
