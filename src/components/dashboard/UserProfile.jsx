import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { BUTTON, INPUT, MODAL, HEIGHTS, cn } from '../../styles/designSystem';

const ProfileContainer = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`
      group
      flex
      items-center
      gap-3
      cursor-pointer
      px-2
      py-1
      h-10
      rounded-lg
      transition-all
      duration-200
      bg-[var(--color-cardBackground)]
      border
      border-[var(--color-border)]
      hover:bg-[var(--select-bg)]
      hover:shadow-md
      hover:border-[var(--color-primary)]
      hover:-translate-y-0.5
      active:translate-y-0
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {children}
  </div>
);

const UserAvatar = ({ children, className = '', color, ...rest }) => (
  <div
    {...rest}
    style={{ backgroundColor: color }}
    className={`
      w-8
      h-8
      rounded-full
      text-white
      font-bold
      text-xs
      flex
      items-center
      justify-center
      flex-shrink-0
      shadow-sm
      ring-2
      ring-white/20
      transition-transform
      duration-200
      group-hover:scale-110
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {children}
  </div>
);

const UserInfo = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`
      flex
      flex-col
      min-w-0
      flex-1
      justify-center
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {children}
  </div>
);

const DisplayName = ({ children, className = '', ...rest }) => (
  <span
    {...rest}
    className={`
      text-[var(--color-text)]
      font-semibold
      text-sm
      tracking-wide
      leading-tight
      whitespace-nowrap
      overflow-hidden
      text-ellipsis
      max-w-[200px]
      transition-colors
      duration-200
      group-hover:text-[var(--color-primary)]
      ${className}
    `.trim().replace(/\s+/g, ' ')}
  >
    {children}
  </span>
);


const EditIcon = (props) => (
  <Edit3 {...props} className={`w-[14px] h-[14px] text-[var(--color-textSecondary)] opacity-0 transition-all group-hover:opacity-100 group-hover:text-[var(--color-primary)] ${props.className || ''}`} />
);

// Modal styles
const ModalOverlay = ({ children, className = '', ...rest }) => (
  <div {...rest} className={cn(MODAL.overlay, className)}>{children}</div>
);

const ModalContent = ({ children, className = '', ...rest }) => (
  <div {...rest} className={cn(MODAL.container, 'max-w-[400px]', className)}>{children}</div>
);

const ModalTitle = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={cn(MODAL.title, className)}>{children}</h3>
);

const Form = ({ children, className = '', ...rest }) => (
  <form {...rest} className={`flex flex-col gap-4 ${className}`}>{children}</form>
);

const StyledInput = ({ className = '', ...rest }) => (
  <input
    {...rest}
    className={cn(INPUT.medium, className)}
  />
);

const ButtonGroup = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex gap-3 justify-end ${className}`}>{children}</div>
);

const PrimaryButton = ({ children, className = '', ...rest }) => (
  <button {...rest} className={cn(BUTTON.primary.medium, className)}>
    {children}
  </button>
);

const SecondaryButton = ({ children, className = '', ...rest }) => (
  <button {...rest} className={cn(BUTTON.secondary.medium, className)}>
    {children}
  </button>
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
            <div className="p-6">
              <ModalTitle>Edit Display Name</ModalTitle>
              <Form onSubmit={handleSubmit}>
                <StyledInput
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
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default UserProfile;
