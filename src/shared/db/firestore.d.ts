import type { Firestore, WriteBatch } from "firebase-admin/firestore";

export declare const db: Firestore;
export declare function getOffset(): Promise<number | undefined>;
export declare function setOffset(value: number): Promise<void>;
export declare function setOffsetBatch(batch: WriteBatch, value: number): void;
export declare function createBatch(): WriteBatch;
