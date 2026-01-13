import React, { useState } from 'react';
import { addCadet } from '../services/cadetService';
import { Company } from '../types';

interface AddCadetProps {
  onBack: () => void;
  onSuccess: () => void;
}

const MS_LEVELS = ['MS1', 'MS2', 'MS3', 'MS4', 'MS5'];
const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Headquarters Company', 'Grizzly Company'];

export default function AddCadet({ onBack, onSuccess }: AddCadetProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    dateOfBirth: '',
    shirtSize: '',
    position: '',
    company: 'Alpha' as Company,
    militaryScienceLevel: 'MS1' as string,
    phoneNumber: '',
    email: '',
    contracted: 'N' as 'Y' | 'N'
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate required fields are filled
    if (!formData.firstName || !formData.lastName) {
      alert('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      await addCadet({
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age ? parseInt(formData.age) : undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        shirtSize: formData.shirtSize || undefined,
        position: formData.position || undefined,
        company: formData.company,
        militaryScienceLevel: formData.militaryScienceLevel,
        phoneNumber: formData.phoneNumber || undefined,
        email: formData.email || undefined,
        contracted: formData.contracted
      });
      alert('Cadet added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error adding cadet:', error);
      alert(`Error adding cadet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Add Cadet</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation min-h-[44px] min-w-[44px]"
          >
            Back
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              id="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              id="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="shirtSize" className="block text-sm font-medium text-gray-700 mb-1">Shirt Size</label>
            <select
              id="shirtSize"
              value={formData.shirtSize}
              onChange={(e) => setFormData({ ...formData, shirtSize: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select size</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
            <select
              id="company"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value as Company })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {COMPANIES.map(comp => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="militaryScienceLevel" className="block text-sm font-medium text-gray-700 mb-1">MS Level *</label>
            <select
              id="militaryScienceLevel"
              required
              value={formData.militaryScienceLevel}
              onChange={(e) => setFormData({ ...formData, militaryScienceLevel: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {MS_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="contracted" className="block text-sm font-medium text-gray-700 mb-1">Contracted *</label>
            <select
              id="contracted"
              required
              value={formData.contracted}
              onChange={(e) => setFormData({ ...formData, contracted: e.target.value as 'Y' | 'N' })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {saving ? 'Adding...' : 'Add Cadet'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

