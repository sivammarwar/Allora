export type AuthStackParams = {
  Login: undefined;
  OTP: { email: string };
};

export type UserTabParams = {
  Home: undefined;
  Bookings: undefined;
  Categories: undefined;
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
  GuestLogin: { role: "USER" | "HERO" };
  GuestOTP: { email: string; role: "USER" | "HERO" };
  GuestSetPassword: { popsAfterDone?: number } | undefined;
  MyReviews: undefined;
  SavedAddresses: undefined;
  PaymentMethods: undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
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
  HeroEarnings: undefined;
  HeroStore: undefined;
  HeroProfile: undefined;
};

export type AgentTabParams = {
  AgentHome: undefined;
  AgentAreas: undefined;
  AgentRequests: undefined;
  AgentHeroes: undefined;
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
