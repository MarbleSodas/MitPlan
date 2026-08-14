const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

export const canonicalizeBase64 = (value, label, { allowEmpty = false } = {}) => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a Base64 string`);
  }

  const normalized = value.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!allowEmpty && normalized.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  if (normalized.length % 4 === 1) {
    throw new Error(`${label} has an invalid Base64 length`);
  }

  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
  if (!BASE64_PATTERN.test(padded)) {
    throw new Error(`${label} contains invalid Base64 characters`);
  }

  return padded;
};

const requirePositiveInteger = (value, label, maximum) => {
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${label} must be an integer between 1 and ${maximum}`);
  }
  return value;
};

export const validateFirebaseHashConfig = (config) => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Firebase password hash configuration must be a JSON object');
  }

  return {
    base64_signer_key: canonicalizeBase64(
      config.base64_signer_key,
      'base64_signer_key'
    ),
    base64_salt_separator: canonicalizeBase64(
      config.base64_salt_separator,
      'base64_salt_separator',
      { allowEmpty: true }
    ),
    rounds: requirePositiveInteger(config.rounds, 'rounds', 64),
    mem_cost: requirePositiveInteger(config.mem_cost, 'mem_cost', 31),
  };
};

export const buildFirebaseScryptHash = (user, config) => {
  if (!user?.passwordHash) {
    throw new Error('Firebase user does not have a password hash');
  }

  const normalizedConfig = validateFirebaseHashConfig(config);
  const salt = canonicalizeBase64(
    user.passwordSalt ?? user.salt,
    'Firebase user password salt'
  );
  const hash = canonicalizeBase64(user.passwordHash, 'Firebase user password hash');

  return [
    '$fbscrypt',
    `v=1,n=${normalizedConfig.mem_cost},r=${normalizedConfig.rounds},p=1,ss=${normalizedConfig.base64_salt_separator},sk=${normalizedConfig.base64_signer_key}`,
    salt,
    hash,
  ].join('$');
};

export const inspectFirebasePasswordUsers = (users, config) => {
  const passwordUsers = users.filter((user) => Boolean(user?.passwordHash));
  if (!config) {
    return {
      passwordUsers: passwordUsers.length,
      validPasswordHashes: 0,
      invalidPasswordHashes: 0,
      passwordHashConfigProvided: false,
    };
  }

  let validPasswordHashes = 0;
  let invalidPasswordHashes = 0;
  for (const user of passwordUsers) {
    try {
      buildFirebaseScryptHash(user, config);
      validPasswordHashes += 1;
    } catch {
      invalidPasswordHashes += 1;
    }
  }

  return {
    passwordUsers: passwordUsers.length,
    validPasswordHashes,
    invalidPasswordHashes,
    passwordHashConfigProvided: true,
  };
};
