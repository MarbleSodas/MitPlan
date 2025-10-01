import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';

const ProfileContainer = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`group flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg transition-colors bg-[var(--color-cardBackground)] border border-[var(--color-border)] hover:bg-[var(--select-bg)] hover:shadow-sm ${className}`}
  >
    {children}
  </div>
);

const UserAvatar = ({ children, className = '', color, ...rest }) => (
  <div
    {...rest}
    style={{ backgroundColor: color }}
    className={`w-10 h-10 rounded-full text-white font-semibold text-sm flex items-center justify-center flex-shrink-0 ${className}`}
  >
    {children}
  </div>
);

const UserInfo = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex flex-col min-w-0 ${className}`}>{children}</div>
);

const DisplayName = ({ children, className = '', ...rest }) => (
  <span {...rest} className={`text-[var(--color-text)] font-medium text-[0.95rem] whitespace-nowrap overflow-hidden text-ellipsis ${className}`}>{children}</span>
);


const EditIcon = (props) => (
  <Edit3 {...props} className={`w-[14px] h-[14px] text-[var(--color-textSecondary)] opacity-0 transition-all group-hover:opacity-100 group-hover:text-[var(--color-primary)] ${props.className || ''}`} />
);

// Modal styles
const ModalOverlay = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 ${className}`}>{children}</div>
);

const ModalContent = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`bg-white dark:bg-neutral-800 rounded-xl p-6 w-full max-w-[400px] shadow-xl border border-neutral-200 dark:border-neutral-700 ${className}`}>{children}</div>
);

const ModalTitle = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`m-0 mb-4 text-neutral-900 dark:text-neutral-100 text-xl font-semibold ${className}`}>{children}</h3>
);

const Form = ({ children, className = '', ...rest }) => (
  <form {...rest} className={`flex flex-col gap-4 ${className}`}>{children}</form>
);

const Input = ({ className = '', ...rest }) => (
  <input
    {...rest}
    className={`px-3 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg text-base bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(51,153,255,0.125)] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
  />
);

const ButtonGroup = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex gap-3 justify-end ${className}`}>{children}</div>
);

const Button = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`px-4 py-3 rounded-lg font-medium cursor-pointer transition-all border-0 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const PrimaryButton = ({ children, className = '', ...rest }) => (
  <Button {...rest} className={`bg-blue-500 text-white hover:bg-blue-600 ${className}`}>{children}</Button>
);

const SecondaryButton = ({ children, className = '', ...rest }) => (
  <Button {...rest} className={`bg-transparent text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${className}`}>{children}</Button>
);

const ErrorMessage = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`text-red-500 text-sm mt-2 ${className}`}>{children}</div>
);

// Generate a consistent color for a user based on their ID
const generateUserColor = (userId) => {
  const colors = [
    '#3399ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Helper function to clean display names (remove quotes if present)
const cleanDisplayName = (name) => {
  if (!name) return name;
  // Remove surrounding quotes if present (handles both single and double quotes)
  if ((name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))) {
    return name.slice(1, -1);
  }
  return name;
};

// Get initials from display name
const getInitials = (displayName) => {
  const cleanName = cleanDisplayName(displayName);
  return cleanName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const UserProfile = () => {
  const { user, anonymousUser, isAnonymousMode, setAnonymousDisplayName } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get current user info
  const currentUser = user || anonymousUser;
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const userId = user?.uid || anonymousUser?.id || 'default';

  const handleEditClick = () => {
    setNewDisplayName(cleanDisplayName(displayName));
    setError('');
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = newDisplayName.trim();
    if (!trimmedName) {
      setError('Display name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (user) {
        // Update authenticated user's display name
        await updateProfile(auth.currentUser, {
          displayName: trimmedName
        });
      } else if (isAnonymousMode && anonymousUser) {
        // Update anonymous user's display name
        setAnonymousDisplayName(trimmedName);
      }

      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating display name:', err);
      setError(err.message || 'Failed to update display name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setIsEditModalOpen(false);
      setError('');
    }
  };

  return (
    <>
      <ProfileContainer onClick={handleEditClick}>
        <UserAvatar color={generateUserColor(userId)}>
          {getInitials(displayName)}
        </UserAvatar>
        <UserInfo>
          <DisplayName>{cleanDisplayName(displayName)}</DisplayName>
        </UserInfo>
        <EditIcon />
      </ProfileContainer>

      {isEditModalOpen && (
        <ModalOverlay onClick={handleCancel}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Edit Display Name</ModalTitle>
            <Form onSubmit={handleSubmit}>
              <Input
                type="text"
                placeholder="Enter your display name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                maxLength={50}
                autoFocus
                disabled={isSubmitting}
              />
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <ButtonGroup>
                <SecondaryButton
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={isSubmitting || !newDisplayName.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </PrimaryButton>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default UserProfile;
