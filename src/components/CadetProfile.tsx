import React, { useState, useEffect, useRef } from 'react';
import { getCadetById, updateCadet, deleteCadet } from '../services/cadetService';
import { getTotalUnexcusedAbsences, getUnexcusedAbsenceDates } from '../services/attendanceService';
import { formatDateWithDay } from '../utils/dates';
import { Cadet, Company } from '../types';

interface CadetProfileProps {
  cadetId: string;
  onBack: () => void;
  onDelete: () => void;
  onCompanyChange?: (oldCompany: Company, newCompany: Company) => void;
}

const MS_LEVELS = ['MS1', 'MS2', 'MS3', 'MS4', 'MS5'];
const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger'];
const DEFAULT_PROFILE_PICTURE = 'https://t3.ftcdn.net/jpg/00/57/04/58/360_F_57045887_HHJml6DJVxNBMqMeDqVJ0ZQDnotp5rGD.jpg';

export default function CadetProfile({ cadetId, onBack, onDelete, onCompanyChange }: CadetProfileProps) {
  const [cadet, setCadet] = useState<Cadet | null>(null);
  const [unexcusedCountPT, setUnexcusedCountPT] = useState<number>(0);
  const [unexcusedCountLab, setUnexcusedCountLab] = useState<number>(0);
  const [unexcusedCountTactics, setUnexcusedCountTactics] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Cadet>>({});
  const [tooltipType, setTooltipType] = useState<'PT' | 'Lab' | 'Tactics' | null>(null);
  const [tooltipDates, setTooltipDates] = useState<string[]>([]);
  const ptRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLDivElement>(null);
  const tacticsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCadet();
  }, [cadetId]);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipType && 
          ptRef.current && !ptRef.current.contains(event.target as Node) &&
          labRef.current && !labRef.current.contains(event.target as Node) &&
          tacticsRef.current && !tacticsRef.current.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest('.absolute.z-50')) {
        setTooltipType(null);
        setTooltipDates([]);
      }
    }

    if (tooltipType) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [tooltipType]);

  async function loadCadet() {
    setLoading(true);
    try {
      const cadetData = await getCadetById(cadetId);
      if (cadetData) {
        setCadet(cadetData);
        setFormData({
          firstName: cadetData.firstName || '',
          lastName: cadetData.lastName || '',
          age: cadetData.age || 0,
          dateOfBirth: cadetData.dateOfBirth || '',
          shirtSize: cadetData.shirtSize || '',
          position: cadetData.position || '',
          company: cadetData.company,
          militaryScienceLevel: cadetData.militaryScienceLevel || 'MS1',
          phoneNumber: cadetData.phoneNumber || '',
          email: cadetData.email || '',
          contracted: cadetData.contracted || 'N',
          profilePicture: cadetData.profilePicture || ''
        });
        
        // Load unexcused absences for PT, Lab, and Tactics separately
        const [countPT, countLab, countTactics] = await Promise.all([
          getTotalUnexcusedAbsences(cadetId, 'PT'),
          getTotalUnexcusedAbsences(cadetId, 'Lab'),
          getTotalUnexcusedAbsences(cadetId, 'Tactics')
        ]);
        setUnexcusedCountPT(countPT);
        setUnexcusedCountLab(countLab);
        setUnexcusedCountTactics(countTactics);
      }
    } catch (error) {
      console.error('Error loading cadet:', error);
      alert(`Error loading cadet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!cadet) return;
    
    setSaving(true);
    try {
      const oldCompany = cadet.company;
      const newCompany = formData.company;
      
      await updateCadet(cadetId, formData);
      
      // If company changed, notify parent component
      if (oldCompany && newCompany && oldCompany !== newCompany && onCompanyChange) {
        onCompanyChange(oldCompany, newCompany);
      }
      
      await loadCadet(); // Reload to get updated data
      setIsEditing(false);
      alert('Cadet profile updated successfully!');
    } catch (error) {
      console.error('Error saving cadet:', error);
      alert(`Error saving cadet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!cadet) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${cadet.firstName} ${cadet.lastName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteCadet(cadetId);
      alert('Cadet deleted successfully!');
      onDelete();
    } catch (error) {
      console.error('Error deleting cadet:', error);
      alert(`Error deleting cadet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!cadet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cadet not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Cadet Profile</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Back
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {cadet.firstName} {cadet.lastName}
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 font-medium touch-manipulation px-3 py-1"
              >
                Edit
              </button>
            )}
          </div>

          {/* Profile Picture */}
          <div className="mb-4">
            {isEditing ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
                <input
                  type="url"
                  value={formData.profilePicture || ''}
                  onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })}
                  placeholder="Enter image URL..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <div className="flex justify-center">
                  <img 
                    src={formData.profilePicture || DEFAULT_PROFILE_PICTURE} 
                    alt={`${cadet.firstName} ${cadet.lastName}`} 
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_PROFILE_PICTURE;
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <img 
                  src={cadet.profilePicture || DEFAULT_PROFILE_PICTURE} 
                  alt={`${cadet.firstName} ${cadet.lastName}`} 
                  className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_PROFILE_PICTURE;
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">{cadet.firstName || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">{cadet.lastName || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">{cadet.age || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">
                  {cadet.dateOfBirth 
                    ? new Date(cadet.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shirt Size</label>
              {isEditing ? (
                <select
                  value={formData.shirtSize || ''}
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
              ) : (
                <div className="text-gray-900">{cadet.shirtSize || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              {isEditing ? (
                <select
                  value={formData.company || 'Alpha'}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value as Company })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {COMPANIES.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-900">{cadet.company || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">{cadet.position || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MS Level</label>
              {isEditing ? (
                <select
                  value={formData.militaryScienceLevel || 'MS1'}
                  onChange={(e) => setFormData({ ...formData, militaryScienceLevel: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {MS_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-900">{cadet.militaryScienceLevel || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">{cadet.phoneNumber || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <div className="text-gray-900">{cadet.email || '—'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contracted</label>
              {isEditing ? (
                <select
                  value={formData.contracted || 'N'}
                  onChange={(e) => setFormData({ ...formData, contracted: e.target.value as 'Y' | 'N' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              ) : (
                <div className="text-gray-900">{cadet.contracted || 'N'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unexcused Absences</label>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-gray-600">PT (Physical Training):</div>
                  <div className="relative" ref={ptRef}>
                    <div 
                      onClick={async () => {
                        if (unexcusedCountPT > 0) {
                          if (tooltipType === 'PT') {
                            // Toggle off if already showing PT tooltip
                            setTooltipType(null);
                            setTooltipDates([]);
                          } else {
                            // Show PT tooltip
                            const dates = await getUnexcusedAbsenceDates(cadetId, 'PT');
                            setTooltipDates(dates);
                            setTooltipType('PT');
                          }
                        }
                      }}
                      className={`text-gray-900 font-semibold ${unexcusedCountPT > 0 ? 'cursor-pointer hover:text-blue-600 underline' : ''}`}
                    >
                      {unexcusedCountPT}
                    </div>
                    {tooltipType === 'PT' && tooltipDates.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-white text-gray-900 text-xs rounded-lg shadow-lg border border-gray-300 p-3 max-h-64 overflow-y-auto">
                        <div className="font-semibold mb-2 text-gray-900">Unexcused PT Dates:</div>
                        <div className="space-y-1">
                          {tooltipDates.map((date, index) => (
                            <div key={index} className="text-gray-700">
                              {formatDateWithDay(date)}
                            </div>
                          ))}
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Lab:</div>
                  <div className="relative" ref={labRef}>
                    <div 
                      onClick={async () => {
                        if (unexcusedCountLab > 0) {
                          if (tooltipType === 'Lab') {
                            // Toggle off if already showing Lab tooltip
                            setTooltipType(null);
                            setTooltipDates([]);
                          } else {
                            // Show Lab tooltip
                            const dates = await getUnexcusedAbsenceDates(cadetId, 'Lab');
                            setTooltipDates(dates);
                            setTooltipType('Lab');
                          }
                        }
                      }}
                      className={`text-gray-900 font-semibold ${unexcusedCountLab > 0 ? 'cursor-pointer hover:text-blue-600 underline' : ''}`}
                    >
                      {unexcusedCountLab}
                    </div>
                    {tooltipType === 'Lab' && tooltipDates.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-white text-gray-900 text-xs rounded-lg shadow-lg border border-gray-300 p-3 max-h-64 overflow-y-auto">
                        <div className="font-semibold mb-2 text-gray-900">Unexcused Lab Dates:</div>
                        <div className="space-y-1">
                          {tooltipDates.map((date, index) => (
                            <div key={index} className="text-gray-700">
                              {formatDateWithDay(date)}
                            </div>
                          ))}
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tactics:</div>
                  <div className="relative" ref={tacticsRef}>
                    <div 
                      onClick={async () => {
                        if (unexcusedCountTactics > 0) {
                          if (tooltipType === 'Tactics') {
                            // Toggle off if already showing Tactics tooltip
                            setTooltipType(null);
                            setTooltipDates([]);
                          } else {
                            // Show Tactics tooltip
                            const dates = await getUnexcusedAbsenceDates(cadetId, 'Tactics');
                            setTooltipDates(dates);
                            setTooltipType('Tactics');
                          }
                        }
                      }}
                      className={`text-gray-900 font-semibold ${unexcusedCountTactics > 0 ? 'cursor-pointer hover:text-blue-600 underline' : ''}`}
                    >
                      {unexcusedCountTactics}
                    </div>
                    {tooltipType === 'Tactics' && tooltipDates.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-white text-gray-900 text-xs rounded-lg shadow-lg border border-gray-300 p-3 max-h-64 overflow-y-auto">
                        <div className="font-semibold mb-2 text-gray-900">Unexcused Tactics Dates:</div>
                        <div className="space-y-1">
                          {tooltipDates.map((date, index) => (
                            <div key={index} className="text-gray-700">
                              {formatDateWithDay(date)}
                            </div>
                          ))}
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {unexcusedCountPT > 0 || unexcusedCountLab > 0 || unexcusedCountTactics > 0
                  ? 'Click on a number to see specific dates' 
                  : 'These are calculated automatically from attendance records'}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadCadet(); // Reset form data
                }}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          )}

          {!isEditing && (
            <button
              onClick={handleDelete}
              className="w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 touch-manipulation min-h-[44px]"
            >
              Delete Cadet
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

