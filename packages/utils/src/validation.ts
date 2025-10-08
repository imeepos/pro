export function validateEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  if (!username) return false;

  if (username.length < 3 || username.length > 20) return false;

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
}
