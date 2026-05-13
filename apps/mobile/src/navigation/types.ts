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
  Payment: { orderId: string; amount: number; description: string; type: "secret-shop" | "booking" };
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
  HeroOrders: undefined;
  HeroProducts: undefined;
  HeroStore: undefined;
  HeroProfile: undefined;
};

export type AgentTabParams = {
  AgentHome: undefined;
  AgentAreas: undefined;
  AgentRequests: undefined;
  AgentPriceControl: undefined;
  AgentInventory: undefined;
  AgentItems: undefined;
  AgentSlotConfig: undefined;
  AgentPaymentHistory: undefined;
  AgentSecretOrders: undefined;
  AgentSecretShops: undefined;
  AgentProfile: undefined;
};

export type PaymentParams = {
  Payment: {
    orderId: string;
    amount: number;
    description: string;
    type: "secret-shop" | "booking";
  };
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
