import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import { LogIn, Shield, Building2, UserCheck, Lock, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react';

interface LoginPageProps {
  onOpenPublicPortal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenPublicPortal }) => {
  const { login } = useAuth();
  const toast = useToast();

  const [usernameOrEmail, setUsernameOrEmail] = useState('superadmin@erp.edu');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const userToLogin = customUser || usernameOrEmail;
    const passToLogin = customPass || password;

    try {
      await login(userToLogin, passToLogin);
      toast.success('Authentication successful. Welcome to School ERP.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogins = [
    {
      role: 'Super Admin',
      school: 'All Campuses (Master Control)',
      username: 'superadmin@erp.edu',
      desc: 'Global ERP administration across Vidya Vahini and Gurukul International',
      icon: <Shield className="w-4 h-4 text-indigo-600" />
    },
    {
      role: 'School Admin',
      school: 'Vidya Vahini Public School (VVPS)',
      username: 'admin.vvps@erp.edu',
      desc: 'Designated campus administration and class roster management',
      icon: <Building2 className="w-4 h-4 text-blue-600" />
    },
    {
      role: 'School Admin',
      school: 'Gurukul International School (GISK)',
      username: 'admin.gisk@erp.edu',
      desc: 'Designated campus administration for Katoria branch',
      icon: <Building2 className="w-4 h-4 text-emerald-600" />
    },
    {
      role: 'Principal',
      school: 'Vidya Vahini Public School',
      username: 'principal.vvps@erp.edu',
      desc: 'Academic leadership, session governance, and staff oversight',
      icon: <UserCheck className="w-4 h-4 text-amber-600" />
    },
    {
      role: 'Teacher',
      school: 'Vidya Vahini Public School',
      username: 'teacher.vvps@erp.edu',
      desc: 'Class teacher view with section rosters',
      icon: <UserCheck className="w-4 h-4 text-purple-600" />
    },
    {
      role: 'Accountant',
      school: 'Vidya Vahini Public School',
      username: 'accountant.vvps@erp.edu',
      desc: 'Finance officer with class capacity and fee structure views',
      icon: <UserCheck className="w-4 h-4 text-cyan-600" />
    },
    {
      role: 'Parent (Multi-Child)',
      school: 'Vidya Vahini Public School',
      username: 'parent.vvps@erp.edu',
      desc: 'Parent portal with child switcher for Aarav & Ananya Sharma',
      icon: <GraduationCap className="w-4 h-4 text-emerald-600" />
    },
    {
      role: 'Student (Learner)',
      school: 'Vidya Vahini Public School',
      username: 'student.vvps@erp.edu',
      desc: 'Student learner portal with timetable, homework & results',
      icon: <GraduationCap className="w-4 h-4 text-indigo-600" />
    }
  ];

  const handleInstantSignIn = (email: string) => {
    setUsernameOrEmail(email);
    setPassword('Admin@123');
    handleLogin(undefined, email, 'Admin@123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-md mb-4">
          SE
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          School ERP Management System
        </h1>
        <p className="mt-1.5 text-xs text-slate-600">
          Centralized Multi-School Academic & Operations Management
        </p>
        <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-center gap-1.5 font-medium">
          <span>Vidya Vahini Public School</span>
          <span aria-hidden="true">·</span>
          <span>Gurukul International School Katoria</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-xl">
          {errorMessage && (
            <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="e.g. superadmin@erp.edu, admin, or admin.vvps"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (e.g. Admin@123)"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign in to ERP'}
            </button>
          </form>

          {/* Public Online Admission Portal Entry */}
          {onOpenPublicPortal && (
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">
                    Applying for New Admission?
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Submit application or track status without staff login
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenPublicPortal}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors shrink-0"
              >
                <span>Public Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Demo Instant Sign-In */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-800">
                1-Click Instant Sign In (Phase 1 Accounts)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Default: Admin@123
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quickLogins.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleInstantSignIn(acc.username)}
                  disabled={loading}
                  className="flex flex-col text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      {acc.icon}
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">
                        {acc.role}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span>Log in</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium truncate mt-1">
                    {acc.school}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                    {acc.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-600">
          School ERP Enterprise Foundation · Phase 1: Auth & Multi-Campus Architecture
        </div>
      </div>
    </div>
  );
};
