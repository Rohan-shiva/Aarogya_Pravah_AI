import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import staffService from "../../services/staffService";
import useAuth from "../../hooks/useAuth";

export const StaffProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await staffService.getStaffProfile();
        if (res.success && res.data) {
          setProfile(res.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsEditing(false);
    setEditSuccess(true);
    setTimeout(() => setEditSuccess(false), 3000);
  };

  return (
    <div className="bg-background text-on-background font-body-lg min-h-screen flex h-screen overflow-hidden">
      {/* SideNavBar */}
      <Sidebar activeSection="profile" />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 h-screen relative overflow-hidden">
        {/* TopAppBar */}
        <header className="bg-surface border-b border-outline-variant h-16 flex items-center justify-between px-gutter z-10 flex-shrink-0">
          <div className="flex items-center w-72 sm:w-96">
            <div className="relative w-full focus-within:ring-1 focus-within:ring-primary rounded-lg transition-shadow">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Search staff, patients..."
                className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-sm text-on-surface focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
              <img
                src={profile?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuB-5UOUTsOt4NO5LMTC5DPKKgvzXFmcfqmzn-4d_26kYSVQOCACjVvuf4W5_rfkp8xOy6vx7b4n0LyFHlDx1XwKQBQbKvyTDc89xZ2cAcsdJfQ0HDkpnf0DSr9R0Sj4xqXrXBQAN9dJVeM1Dlij4a7e7FMxU_GXrDzvJlt3OGo3o-6PnT7xvfniw6dhkMuBeCvDwQQbJrk9mIcRaDIOP24HruvlWDanlu6sxTpHZN2bnVT3QZYwb3YO"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto p-gutter bg-background">
          <div className="max-w-6xl mx-auto space-y-6">
            {editSuccess && (
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-lg text-sm border border-emerald-300">
                Profile updated successfully.
              </div>
            )}

            {/* Hero Profile Header */}
            <div className="bg-surface border border-outline-variant rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-container shrink-0 shadow-sm">
                <img
                  src={profile?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuB-5UOUTsOt4NO5LMTC5DPKKgvzXFmcfqmzn-4d_26kYSVQOCACjVvuf4W5_rfkp8xOy6vx7b4n0LyFHlDx1XwKQBQbKvyTDc89xZ2cAcsdJfQ0HDkpnf0DSr9R0Sj4xqXrXBQAN9dJVeM1Dlij4a7e7FMxU_GXrDzvJlt3OGo3o-6PnT7xvfniw6dhkMuBeCvDwQQbJrk9mIcRaDIOP24HruvlWDanlu6sxTpHZN2bnVT3QZYwb3YO"}
                  alt="Staff Headshot"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="font-display-lg text-display-lg text-on-surface mb-1">
                  {profile?.name || user?.name || "Dr. Aris Thorne"}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 font-body-md text-sm text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    {profile?.role || "Senior Cardiologist"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-outline"></span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">domain</span>
                    {profile?.department || "Cardiology Department"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 border border-outline-variant text-primary rounded-lg font-body-md text-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
                <button
                  onClick={() => alert("Leave schedule requested with Hospital Administration.")}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-body-md text-sm font-semibold hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  Schedule Leave
                </button>
              </div>
            </div>

            {/* Bento Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Personal & Professional Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Info Card */}
                <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 font-body-md text-sm">
                    <div>
                      <p className="text-secondary mb-0.5">Full Name</p>
                      <p className="text-on-surface font-medium">{profile?.name || "Dr. Aris Thorne"}</p>
                    </div>
                    <div>
                      <p className="text-secondary mb-0.5">Employee ID</p>
                      <p className="font-data-display text-on-surface font-semibold">{profile?.employeeId || "EMP-2048-CT"}</p>
                    </div>
                    <div>
                      <p className="text-secondary mb-0.5">Hospital Email</p>
                      <p className="text-on-surface font-medium">{profile?.email || "a.thorne@aarogyapravah.ai"}</p>
                    </div>
                    <div>
                      <p className="text-secondary mb-0.5">Contact Number</p>
                      <p className="text-on-surface font-medium">{profile?.contact || "+1 (555) 284-9382"}</p>
                    </div>
                  </div>
                </div>

                {/* Professional Credentials */}
                <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-surface-container-high rounded-bl-full opacity-20 -z-10 pointer-events-none"></div>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">verified</span>
                    Professional Credentials
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 font-body-md text-sm">
                    <div>
                      <p className="text-secondary mb-0.5">Medical License</p>
                      <p className="font-data-display text-on-surface font-semibold">{profile?.license || "MED-LI-773829"}</p>
                    </div>
                    <div>
                      <p className="text-secondary mb-0.5">Date of Joining</p>
                      <p className="text-on-surface font-medium">{profile?.dateOfJoining || "October 14, 2018"}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-secondary mb-2">Specializations</p>
                      <div className="flex flex-wrap gap-2">
                        {profile?.specializations?.map((spec, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-surface-container-high text-primary rounded-full font-label-sm text-xs font-semibold"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Status & Settings */}
              <div className="space-y-6">
                {/* Shift & Availability */}
                <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">schedule</span>
                      Shift Status
                    </h3>
                    <span className="px-2.5 py-1 bg-secondary-container text-on-secondary-container rounded-md font-label-sm text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      On-Duty
                    </span>
                  </div>
                  <div className="space-y-4 font-body-md text-sm">
                    <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                      <p className="text-secondary text-xs mb-1">Current Assignment</p>
                      <p className="text-on-surface font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">ward</span>
                        {profile?.currentAssignment || "Ward 4B - Cardiac ICU"}
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary text-xs mb-2">Today's Schedule</p>
                      <div className="space-y-2">
                        {profile?.todaySchedule?.map((sched, idx) => (
                          <div
                            key={idx}
                            className={`flex justify-between items-center text-xs border-l-2 pl-2 ${
                              idx === 0 ? "border-primary font-semibold" : "border-outline-variant"
                            }`}
                          >
                            <span className="text-on-surface">{sched.title}</span>
                            <span className="font-data-display text-secondary">{sched.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Settings Mini */}
                <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">manage_accounts</span>
                    Account & Security
                  </h3>
                  <ul className="space-y-2 font-body-md text-sm">
                    <li>
                      <button
                        onClick={() => alert("Password update link dispatched to registered email.")}
                        className="w-full flex items-center justify-between p-2 hover:bg-surface-container rounded-lg transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary text-base">password</span>
                          <span className="text-on-surface">Update Password</span>
                        </div>
                        <span className="material-symbols-outlined text-secondary text-base">chevron_right</span>
                      </button>
                    </li>
                    <li>
                      <div className="w-full flex items-center justify-between p-2 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary text-base">security</span>
                          <span className="text-on-surface">Two-Factor Auth</span>
                        </div>
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium text-xs">
                          Enabled
                        </span>
                      </div>
                    </li>
                    <li>
                      <button
                        onClick={() => alert("Notification preferences opened.")}
                        className="w-full flex items-center justify-between p-2 hover:bg-surface-container rounded-lg transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary text-base">notifications_active</span>
                          <span className="text-on-surface">Notification Prefs</span>
                        </div>
                        <span className="material-symbols-outlined text-secondary text-base">chevron_right</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffProfile;
