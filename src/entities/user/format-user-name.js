export function formatUserName(user) {
  const parts = [user.first_name];
  if (user.last_name) {
    parts.push(user.last_name);
  }
  return parts.join(" ");
}
