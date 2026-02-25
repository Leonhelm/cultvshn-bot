export declare function formatUserName(user: {
  first_name: string;
  last_name?: string | null;
}): string;

export declare function formatUserInfo(user: {
  id: number;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
}): string;
