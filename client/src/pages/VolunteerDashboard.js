import React from 'react';
import { motion } from 'framer-motion';

const VolunteerDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container-custom py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Volunteer Dashboard</h1>
          <p className="text-gray-600 mb-8">Manage your volunteer activities</p>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-gray-500">Volunteer dashboard coming soon...</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VolunteerDashboard;
