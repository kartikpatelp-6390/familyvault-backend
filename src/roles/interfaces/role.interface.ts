export interface Permission {
  module_key: string;
  actions: string[];
}

export interface Role {
  _id?: string;
  name: string;
  permissions: Permission[];
  is_active: boolean;
}
