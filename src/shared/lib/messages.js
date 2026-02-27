export const MSG_COMMANDS = "Доступные команды:\n/list";
export const MSG_LIST_HEADER = "Сохранённые товары маркетплейсов:";
export const MSG_LIST_EMPTY = `Список пуст.\n\n${MSG_COMMANDS}`;
export const MSG_LINK_SAVED = `Ссылка сохранена!\n\n${MSG_COMMANDS}`;
export const MSG_LINK_DELETED = `Ссылка удалена!\n\n${MSG_COMMANDS}`;
export const MSG_LINK_NOT_FOUND = `Ссылка не найдена.\n\n${MSG_COMMANDS}`;
export const MSG_UNVERIFIED = "Тебя скоро добавят, подожди немного.";

/** @param {Array<{id: string}>} links */
export function msgList(links) {
  if (links.length === 0) return MSG_LIST_EMPTY;

  const rows = links.map(
    (l) => `/mp_view_${l.id} · /mp_delete_${l.id}`,
  );

  return `${MSG_LIST_HEADER}\n${rows.join("\n")}\n\n${MSG_COMMANDS}`;
}
