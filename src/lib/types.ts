export type UserSummary = { id: string; name: string; email: string };

export type DocumentListItem = {
  id: string;
  title: string;
  updatedAt: string;
  owner: UserSummary;
};

export type DocumentListResponse = {
  owned: DocumentListItem[];
  shared: DocumentListItem[];
};

export type DocumentShareSummary = {
  id: string;
  userId: string;
  user: UserSummary;
};

export type DocumentDetail = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  ownerId: string;
  owner: UserSummary;
  shares: DocumentShareSummary[];
  role: "owner" | "editor";
};
