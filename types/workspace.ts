export type Workspace = {
  id: number;
  public_id?: string;
  name: string;
  slug: string;
  status: string;
  role: string;
  locale?: string;
  timezone?: string;
  source: "backend" | "legacy";
};
