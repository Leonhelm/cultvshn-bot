export interface OrderListMessage {
  docId: string;
  chatId: number;
  messageId: number;
  orderId: string;
}

export declare function saveOrderListMessage(chatId: number, messageId: number, orderId: string): Promise<void>;
export declare function getOrderListMessagesByChat(chatId: number): Promise<OrderListMessage[]>;
export declare function deleteOrderListMessagesByChat(chatId: number): Promise<void>;
export declare function deleteOrderListMessageByOrder(orderId: string): Promise<void>;
