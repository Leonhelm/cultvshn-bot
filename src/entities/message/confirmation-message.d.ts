export interface ConfirmationMessage {
  docId: string;
  adminChatId: number;
  messageId: number;
  targetChatId: number;
}

export declare function saveConfirmationMessage(
  adminChatId: number,
  messageId: number,
  targetChatId: number,
): Promise<void>;
export declare function getConfirmationsByTarget(targetChatId: number): Promise<ConfirmationMessage[]>;
export declare function deleteConfirmationsByTarget(targetChatId: number): Promise<void>;
