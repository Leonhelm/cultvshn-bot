export declare const MSG_COMMANDS: string;
export declare const MSG_LIST_HEADER: string;
export declare const MSG_LIST_EMPTY: string;
export declare const MSG_LINK_SAVED: string;
export declare const MSG_LINK_DELETED: string;
export declare const MSG_LINK_NOT_FOUND: string;
export declare const MSG_UNVERIFIED: string;
export declare const MSG_LINK_LIMIT: string;
export declare const MSG_INFO: string;

export interface ListResult {
  text: string;
  reply_markup?: {
    inline_keyboard: Array<
      Array<{ text: string; callback_data: string }>
    >;
  };
}

export function msgList(
  links: Array<{ id: string; name?: string }>,
): ListResult;
