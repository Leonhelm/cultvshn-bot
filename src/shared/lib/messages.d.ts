export declare const MSG_COMMANDS: string;
export declare const MSG_ADMIN_COMMANDS: string;
export declare const MSG_UNVERIFIED: string;
export declare const MSG_REJECTED_REPLY: string;
export declare const MSG_INFO: string;

export declare const MSG_VERIFY_REQUEST: (
  name: string,
  username: string | undefined,
  chatId: string,
) => string;
export declare const BTN_VERIFY: string;
export declare const BTN_REJECT: string;
export declare const MSG_VERIFIED: string;
export declare const MSG_REJECTED: string;
export declare const MSG_VERIFY_DONE: (
  name: string,
  action: "verified" | "rejected",
) => string;
export declare const MSG_PENDING_EMPTY: string;
export declare const MSG_PENDING_ENTRY: (
  name: string,
  username: string | undefined,
  chatId: string,
) => string;
