export interface OrderData {
  chatId: number;
  url: string;
  createdAt: Date;
}

export interface OrderWithId extends OrderData {
  orderId: string;
}

export declare function saveOrder(chatId: number, url: string): Promise<string>;
export declare function getOrdersByChat(chatId: number): Promise<OrderWithId[]>;
export declare function getOrder(orderId: string): Promise<OrderWithId | null>;
export declare function deleteOrder(orderId: string): Promise<void>;
