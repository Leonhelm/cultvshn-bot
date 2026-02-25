export function formatUserName(user) {
  const parts = [user.first_name];
  if (user.last_name) {
    parts.push(user.last_name);
  }
  return parts.join(" ");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatUserInfo(user) {
  const parts = [escapeHtml(user.first_name)];
  if (user.last_name) {
    parts.push(escapeHtml(user.last_name));
  }
  if (user.username) {
    parts.push(`<a href="tg://user?id=${user.id}">@${escapeHtml(user.username)}</a>`);
  } else {
    parts.push(`<a href="tg://user?id=${user.id}">${parts[0]}</a>`);
  }
  return parts.join(" ");
}
