export type AuthStackParams = {
  Login: undefined;
  OTP: { email: string };
};

export type UserTabParams = {
  Home: undefined;
  Bookings: undefined;
  Profile: undefined;
};

export type UserStackParams = {
  UserTabs: undefined;
  SubcategoryDetail: { id: string; agentId?: string };
  CategoryDetail: { id: string };
  OrderDetail: { id: string };
};

export type HeroTabParams = {
  HeroHome: undefined;
  HeroRequests: undefined;
  HeroSlots: undefined;
  HeroProfile: undefined;
};

export type AgentTabParams = {
  AgentHome: undefined;
  AgentAreas: undefined;
  AgentProfile: undefined;
};

export type RootStackParams = {
  Auth: undefined;
  UserApp: undefined;
  HeroApp: undefined;
  AgentApp: undefined;
};
