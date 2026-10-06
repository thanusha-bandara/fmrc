export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be exactly 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8}$/;
