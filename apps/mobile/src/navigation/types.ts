export type AuthStackParams = {
  Login: undefined;
  OTP: { email: string };
};

export type UserTabParams = {
  Home: undefined;
  Bookings: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type UserStackParams = {
  UserTabs: undefined;
  SubcategoryDetail: { id: string; agentId?: string };
  CategoryDetail: { id: string };
  OrderDetail: { id: string };
  Rate: { bookingId: string; heroName?: string; serviceName?: string };
  Notifications: undefined;
};

export type DeliveryTabParams = {
  DeliveryDashboard: undefined;
  DeliveryOrders: undefined;
  DeliveryProfile: undefined;
};

export type HeroTabParams = {
  HeroHome: undefined;
  HeroRequests: undefined;
  HeroSlots: undefined;
  HeroServices: undefined;
  HeroEarnings: undefined;
  HeroProfile: undefined;
};

export type AgentTabParams = {
  AgentHome: undefined;
  AgentAreas: undefined;
  AgentRequests: undefined;
  AgentPriceControl: undefined;
  AgentProfile: undefined;
};

export type SecretShopTabParams = {
  SecretShopHome: undefined;
  SecretShopCart: undefined;
  SecretShopOrders: undefined;
  SecretShopProfile: undefined;
};

export type RootStackParams = {
  Auth: undefined;
  UserApp: undefined;
  HeroApp: undefined;
  AgentApp: undefined;
  SecretShopApp: undefined;
};
