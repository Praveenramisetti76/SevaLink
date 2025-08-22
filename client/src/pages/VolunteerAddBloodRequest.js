import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import FormInput from '../components/ui/FormInput';
import FormSelect from '../components/ui/FormSelect';
import AddressInput from '../components/ui/AddressInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { showError, showSuccess } from '../utils/alerts';

const VolunteerAddBloodRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bloodType: '',
    urgencyLevel: 'medium',
    unitsNeeded: 1,
    patientName: '',
    patientAge: '',
    hospitalName: '',
    contactPhone: '',
    dueDate: '',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: null
    }
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bloodTypeOptions = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low - Within a week' },
    { value: 'medium', label: 'Medium - Within 3 days' },
    { value: 'high', label: 'High - Within 24 hours' },
    { value: 'urgent', label: 'Urgent - Immediate need' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLocationChange = (location) => {
    setFormData(prev => ({
      ...prev,
      location
    }));

    // Clear location-related errors
    const newErrors = { ...errors };
    ['address', 'city', 'state', 'pincode'].forEach(field => {
      delete newErrors[field];
    });
    setErrors(newErrors);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.bloodType) newErrors.bloodType = 'Blood type is required';
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!formData.patientAge || formData.patientAge < 1 || formData.patientAge > 120) {
      newErrors.patientAge = 'Valid patient age is required';
    }
    if (!formData.hospitalName.trim()) newErrors.hospitalName = 'Hospital name is required';
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!formData.unitsNeeded || formData.unitsNeeded < 1) {
      newErrors.unitsNeeded = 'Valid number of units is required';
    }

    // Validate location
    if (!formData.location.address.trim()) newErrors.address = 'Address is required';
    if (!formData.location.city.trim()) newErrors.city = 'City is required';
    if (!formData.location.state.trim()) newErrors.state = 'State is required';
    if (!formData.location.pincode.trim()) newErrors.pincode = 'PIN code is required';

    // Validate due date is in the future
    if (formData.dueDate && new Date(formData.dueDate) <= new Date()) {
      newErrors.dueDate = 'Due date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        ...formData,
        type: 'blood'
      };

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        showSuccess('Success', 'Blood request created successfully!');
        navigate('/volunteer-dashboard/my-requests');
      } else {
        const errorData = await response.json();
        showError('Error', errorData.message || 'Failed to create blood request');
      }
    } catch (error) {
      console.error('Error creating blood request:', error);
      showError('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <HeartIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Create Blood Request</h1>
              <p className="text-red-100">Help save a life by creating a blood donation request</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormInput
                label="Request Title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Urgent Blood Needed for Surgery"
                required
                error={errors.title}
              />

              <FormSelect
                label="Blood Type"
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                options={bloodTypeOptions}
                placeholder="Select blood type"
                required
                error={errors.bloodType}
              />

              <FormSelect
                label="Urgency Level"
                name="urgencyLevel"
                value={formData.urgencyLevel}
                onChange={handleChange}
                options={urgencyOptions}
                required
                error={errors.urgencyLevel}
              />

              <FormInput
                label="Units Needed"
                name="unitsNeeded"
                type="number"
                value={formData.unitsNeeded}
                onChange={handleChange}
                placeholder="Number of blood units"
                min="1"
                max="10"
                required
                error={errors.unitsNeeded}
              />
            </div>

            <div className="mt-6">
              <div className="lg:col-span-2">
                <FormInput
                  label="Description"
                  name="description"
                  type="textarea"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide details about the medical condition, urgency, and any specific requirements..."
                  rows={4}
                  required
                  error={errors.description}
                />
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
              Patient Information
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormInput
                label="Patient Name"
                name="patientName"
                type="text"
                value={formData.patientName}
                onChange={handleChange}
                placeholder="Patient's full name"
                required
                error={errors.patientName}
              />

              <FormInput
                label="Patient Age"
                name="patientAge"
                type="number"
                value={formData.patientAge}
                onChange={handleChange}
                placeholder="Age in years"
                min="1"
                max="120"
                required
                error={errors.patientAge}
              />

              <FormInput
                label="Hospital Name"
                name="hospitalName"
                type="text"
                value={formData.hospitalName}
                onChange={handleChange}
                placeholder="Name of the hospital"
                required
                error={errors.hospitalName}
              />

              <FormInput
                label="Contact Phone"
                name="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="Contact number for coordination"
                required
                error={errors.contactPhone}
              />

              <FormInput
                label="Required By Date"
                name="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={handleChange}
                min={getMinDate()}
                required
                error={errors.dueDate}
              />
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
              Location Information
            </h2>
            
            <AddressInput
              address={formData.location}
              onChange={handleLocationChange}
              errors={errors}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={() => navigate('/volunteer-dashboard')}
              className="px-6 py-3 border border-gray-300 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  <span>Creating Request...</span>
                </>
              ) : (
                <>
                  <HeartIcon className="w-5 h-5" />
                  <span>Create Blood Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default VolunteerAddBloodRequest;
