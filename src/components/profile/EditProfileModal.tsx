import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../common/Toast.js';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  Check,
  AlertCircle,
  Lock,
  Camera,
  Upload,
  RefreshCw,
  Trash2,
  ZoomIn,
  X,
  Sparkles
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, uploadProfilePhoto, removeProfilePhoto } = useAuth();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  // Image Cropping & Preview States
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<string>('');
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Sync state with current authenticated user
  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setDisplayName(user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim());
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || null);
      setValidationError(null);
      setPhotoError(null);
      setIsCropping(false);
      setSelectedImageSrc(null);
    }
  }, [user, isOpen]);

  // Handle File Selection with validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    // 1. Validate MIME type & file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    const isExtValid = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt || '');

    if (!isMimeValid && !isExtValid) {
      const err = 'Please upload a JPG, PNG or WEBP image.';
      setPhotoError(err);
      toast.error(err);
      return;
    }

    // 2. Validate File Size (Max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      const err = 'Image size must be less than 5 MB.';
      setPhotoError(err);
      toast.error(err);
      return;
    }

    // 3. Validate image integrity and dimensions
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 32 || img.height < 32) {
          const err = 'Image dimensions must be at least 32x32 pixels.';
          setPhotoError(err);
          toast.error(err);
          return;
        }

        setImageDimensions({ width: img.width, height: img.height });
        setSelectedImageSrc(result);
        setSelectedFileName(file.name);
        setSelectedFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
        setCropZoom(1);
        setIsCropping(true);
      };

      img.onerror = () => {
        const err = 'Failed to load image. The file may be corrupt.';
        setPhotoError(err);
        toast.error(err);
      };

      img.src = result;
    };

    reader.onerror = () => {
      const err = 'Failed to read file from device.';
      setPhotoError(err);
      toast.error(err);
    };

    reader.readAsDataURL(file);
  };

  // Render and apply cropped image
  const handleApplyCroppedPhoto = async () => {
    if (!selectedImageSrc) return;

    setIsPhotoLoading(true);
    setPhotoError(null);

    try {
      // Create canvas for 400x400 square avatar
      const canvas = document.createElement('canvas');
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas rendering context not available.');
      }

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for cropping.'));
        img.src = selectedImageSrc;
      });

      // Calculate square center crop with zoom
      const minDim = Math.min(img.width, img.height);
      const cropDim = minDim / cropZoom;
      const sx = (img.width - cropDim) / 2;
      const sy = (img.height - cropDim) / 2;

      // Fill with clean background in case of transparent PNG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw cropped square
      ctx.drawImage(img, sx, sy, cropDim, cropDim, 0, 0, size, size);

      // Export as high-quality JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Upload to server immediately
      const updatedUser = await uploadProfilePhoto(dataUrl);
      setAvatarUrl(updatedUser.avatarUrl || dataUrl);
      setIsCropping(false);
      setSelectedImageSrc(null);
      toast.success('Profile photo uploaded and updated successfully.');
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to process and save photo.');
      toast.error(err.message || 'Failed to save profile photo.');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    setIsPhotoLoading(true);
    setPhotoError(null);
    try {
      await removeProfilePhoto();
      setAvatarUrl(null);
      setIsCropping(false);
      setSelectedImageSrc(null);
      toast.success('Profile photo removed. Default avatar restored.');
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to remove photo.');
      toast.error(err.message || 'Failed to remove photo.');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // Save full profile details (names, contact)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDisplay = displayName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst) {
      setValidationError('First name cannot be empty.');
      return;
    }
    if (trimmedFirst.length < 2 || trimmedFirst.length > 50) {
      setValidationError('First name must be between 2 and 50 characters.');
      return;
    }

    if (!trimmedLast) {
      setValidationError('Last name cannot be empty.');
      return;
    }
    if (trimmedLast.length < 2 || trimmedLast.length > 50) {
      setValidationError('Last name must be between 2 and 50 characters.');
      return;
    }

    if (!trimmedDisplay) {
      setValidationError('Display name cannot be empty.');
      return;
    }
    if (trimmedDisplay.length < 2 || trimmedDisplay.length > 150) {
      setValidationError('Display name must be between 2 and 150 characters.');
      return;
    }

    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setValidationError('Please provide a valid email address.');
        return;
      }
    }

    setLoading(true);
    try {
      await updateProfile({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        displayName: trimmedDisplay,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        avatarUrl: avatarUrl || null
      });

      toast.success('Profile and personal information updated successfully.');
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to update profile.');
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  // Compute initials for default avatar
  const activeDisplayName = displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim() || 'Super Admin';
  const initials = activeDisplayName
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SA';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personal Information & Account Settings"
      description="Update your personal details, profile photo, and contact information."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Separation Card (CRITICAL ARCHITECTURE REQUIREMENT) */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                    System Role Designation
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-indigo-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                    <Lock className="w-3 h-3 text-indigo-600" />
                    RBAC Protected
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {user?.roleDisplayName || 'Super Admin'}
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-500 font-mono">User ID</span>
              <div className="text-xs font-semibold text-slate-700 font-mono truncate max-w-[140px]">
                {user?.id}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-indigo-100/80 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Important Role Separation:</strong> Your personal/display name and profile photo are customizable. Your system role (<strong>Super Admin</strong>) and RBAC permissions remain strictly enforced and unchanged.
          </div>
        </div>

        {/* Global Validation Error */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. PROFESSIONAL PROFILE PHOTO MANAGEMENT SECTION           */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              Profile Photo
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              JPG, PNG, WEBP · Max 5 MB
            </span>
          </div>

          {/* Photo Error Banner */}
          {photoError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{photoError}</span>
              </div>
              <button
                type="button"
                onClick={() => setPhotoError(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Hidden File Input supporting Desktop, Laptop, iOS, Android & Tablet */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!isCropping ? (
            /* Standard Avatar & Action Buttons View */
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Current Photo / Default Avatar */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full ring-4 ring-slate-100 shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={activeDisplayName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white flex flex-col items-center justify-center font-bold text-2xl select-none">
                      <span>{initials}</span>
                    </div>
                  )}
                </div>

                {avatarUrl && (
                  <span
                    className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs"
                    title="Profile photo is active"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
              </div>

              {/* Action Buttons & Instructions */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {avatarUrl ? 'Current Profile Photo' : 'Default System Avatar'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                    {avatarUrl ? 'Custom Image' : 'Initials'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your photo is visible in top navigation bars, user tables, and account menus across Desktop, Laptop, Android, iPhone, and Tablet devices.
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                  {!avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPhotoLoading}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isPhotoLoading}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Change Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isPhotoLoading}
                        className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Remove Photo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Interactive Image Preview & Cropper Adjustment Panel */
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Adjust &amp; Preview Profile Photo</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedFileName} ({selectedFileSize})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Masked Avatar Preview */}
                <div className="relative shrink-0">
                  <div className="w-28 h-28 rounded-full ring-4 ring-indigo-500/20 shadow-md overflow-hidden bg-slate-900 flex items-center justify-center">
                    {selectedImageSrc && (
                      <img
                        src={selectedImageSrc}
                        alt="Crop Preview"
                        className="w-full h-full object-cover transition-transform duration-75"
                        style={{
                          transform: `scale(${cropZoom})`
                        }}
                      />
                    )}
                  </div>
                  <div className="text-center mt-1.5 text-[10px] text-slate-500 font-medium">
                    Avatar Preview
                  </div>
                </div>

                {/* Adjuster Controls */}
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3 h-3 text-slate-400" />
                        Zoom / Scale
                      </span>
                      <span className="font-mono text-[11px] text-indigo-600 font-semibold">
                        {cropZoom.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Standard</span>
                      <span>Zoom In</span>
                    </div>
                  </div>

                  {/* Buttons for Preview Panel */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100/70">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCropping(false);
                        setSelectedImageSrc(null);
                      }}
                      disabled={isPhotoLoading}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPhotoLoading}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyCroppedPhoto}
                      disabled={isPhotoLoading}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isPhotoLoading ? (
                        <span>Saving Photo...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply &amp; Save Photo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. PERSONAL IDENTIFICATION & DISPLAY NAME                  */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-1">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Personal Identification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. Rajesh or Diwakar"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. Sharma or Kumar"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setDisplayName(`${firstName.trim()} ${lastName.trim()}`.trim())}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Reset to Full Name
              </button>
            </div>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-900"
              placeholder="e.g. Diwakar Kumar or Admin Director"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This name will appear on the top navigation bar, profile menu, dashboard welcome greeting, and user directory.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. CONTACT INFORMATION                                     */}
        {/* ========================================================= */}
        <div className="space-y-4 pt-1">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                placeholder="admin@schoolerp.internal"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. MODAL ACTION BUTTONS                                   */}
        {/* ========================================================= */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isPhotoLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
