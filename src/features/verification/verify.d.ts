import type { IncomingMessage } from "../../entities/message/index.js";
import type { IncomingCallback } from "../../entities/message/index.js";

export interface VerificationResult {
  action: "verify" | "reject";
  targetChatId: number;
}

export declare function handleUnverifiedUser(msg: IncomingMessage): Promise<void>;
export declare function handleVerificationCallback(callback: IncomingCallback): Promise<VerificationResult | null>;
