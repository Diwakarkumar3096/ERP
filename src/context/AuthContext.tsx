import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import type { CurrentUser, School, AcademicSession } from '../types/erp.js';

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  activeSchool: School | null;
  activeSession: AcademicSession | null;
  availableSchools: School[];
  availableSessions: AcademicSession[];
  isSuperAdmin: boolean;
  hasPermission: (permissionId: string) => boolean;
  canAccessSchool: (schoolId: string) => boolean;
  switchSchool: (schoolId: string | null) => Promise<void>;
  switchSession: (sessionId: string) => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (profileData: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string | null;
  }) => Promise<CurrentUser>;
  uploadProfilePhoto: (photoData: string) => Promise<CurrentUser>;
  removeProfilePhoto: () => Promise<CurrentUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [activeSchool, setActiveSchool] = useState<School | null>(null);
  const [availableSessions, setAvailableSessions] = useState<AcademicSession[]>([]);
  const [activeSession, setActiveSession] = useState<AcademicSession | null>(null);

  const isSuperAdmin = user?.roleName === 'super_admin';

  const hasPermission = useCallback((permissionId: string): boolean => {
    if (!user) return false;
    if (user.roleName === 'super_admin') return true;
    return user.permissions.includes(permissionId);
  }, [user]);

  const canAccessSchool = useCallback((schoolId: string): boolean => {
    if (!user) return false;
    if (user.roleName === 'super_admin' || user.permissions.includes('schools.switch')) return true;
    return user.schoolId === schoolId;
  }, [user]);

  const loadSchoolsAndSessions = useCallback(async (currentUser: CurrentUser, targetSchoolId?: string | null) => {
    try {
      const schoolsData = await api.schools.list();
      setAvailableSchools(schoolsData.schools);

      // Determine active school
      let selectedSchool: School | null = null;
      if (targetSchoolId) {
        selectedSchool = schoolsData.schools.find((s: School) => s.id === targetSchoolId) || null;
      } else if (currentUser.schoolId) {
        selectedSchool = schoolsData.schools.find((s: School) => s.id === currentUser.schoolId) || null;
      } else if (schoolsData.schools.length > 0 && currentUser.roleName === 'super_admin') {
        // Super admin can select 'All Schools' or first school
        selectedSchool = schoolsData.schools[0];
      }
      setActiveSchool(selectedSchool);

      if (selectedSchool) {
        const sessionsData = await api.sessions.list(selectedSchool.id);
        setAvailableSessions(sessionsData.sessions);
        const currentSess = sessionsData.sessions.find((s: AcademicSession) => s.is_current) || sessionsData.sessions[0] || null;
        setActiveSession(currentSess);
      } else {
        setAvailableSessions([]);
        setActiveSession(null);
      }
    } catch (err) {
      console.error('[LOAD SCHOOLS/SESSIONS ERROR]', err);
    }
  }, []);

  const activeSchoolRef = React.useRef(activeSchool);
  activeSchoolRef.current = activeSchool;

  const refreshAuth = useCallback(async () => {
    try {
      const meRes = await api.auth.me();
      setUser(meRes.user);
      await loadSchoolsAndSessions(meRes.user, activeSchoolRef.current?.id || meRes.user.schoolId);
    } catch {
      setUser(null);
      setActiveSchool(null);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  }, [loadSchoolsAndSessions]);

  useEffect(() => {
    refreshAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setActiveSchool(null);
      setActiveSession(null);
      setAvailableSchools([]);
      setAvailableSessions([]);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [refreshAuth]);

  const login = async (usernameOrEmail: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(usernameOrEmail, password);
      setUser(res.user);
      await loadSchoolsAndSessions(res.user, res.user.schoolId);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setActiveSchool(null);
      setActiveSession(null);
      setAvailableSchools([]);
      setAvailableSessions([]);
    }
  };

  const switchSchool = async (schoolId: string | null) => {
    if (!user) return;
    if (schoolId && !canAccessSchool(schoolId)) {
      throw new Error('Access denied to requested school.');
    }

    if (!schoolId) {
      setActiveSchool(null);
      setAvailableSessions([]);
      setActiveSession(null);
      return;
    }

    const school = availableSchools.find(s => s.id === schoolId) || null;
    setActiveSchool(school);

    if (school) {
      try {
        const sessionsData = await api.sessions.list(school.id);
        setAvailableSessions(sessionsData.sessions);
        const currentSess = sessionsData.sessions.find((s: AcademicSession) => s.is_current) || sessionsData.sessions[0] || null;
        setActiveSession(currentSess);
      } catch (err) {
        console.error('[SWITCH SCHOOL SESSIONS ERROR]', err);
      }
    }
  };

  const switchSession = (sessionId: string) => {
    const sess = availableSessions.find(s => s.id === sessionId) || null;
    if (sess) {
      setActiveSession(sess);
    }
  };

  const updateProfile = async (profileData: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string | null;
  }): Promise<CurrentUser> => {
    const res = await api.auth.updateProfile(profileData);
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('session_user', JSON.stringify(res.user));
    }
    return res.user;
  };

  const uploadProfilePhoto = async (photoData: string): Promise<CurrentUser> => {
    const res = await api.auth.uploadProfilePhoto(photoData);
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('session_user', JSON.stringify(res.user));
    }
    return res.user;
  };

  const removeProfilePhoto = async (): Promise<CurrentUser> => {
    const res = await api.auth.removeProfilePhoto();
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('session_user', JSON.stringify(res.user));
    }
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeSchool,
        activeSession,
        availableSchools,
        availableSessions,
        isSuperAdmin,
        hasPermission,
        canAccessSchool,
        switchSchool,
        switchSession,
        login,
        logout,
        refreshAuth,
        updateProfile,
        uploadProfilePhoto,
        removeProfilePhoto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
