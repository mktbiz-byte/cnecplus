// CNEC Commerce Types & Constants
// NOTE: Entity interfaces below are kept for backward compatibility.
// For new code, prefer Prisma generated types from '@/generated/prisma/client'.

// =============================================
// ENUMS
// =============================================

export type UserRole = 'super_admin' | 'brand_admin' | 'creator' | 'buyer';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type CampaignType = 'GONGGU' | 'ALWAYS';
export type CampaignStatus = 'DRAFT' | 'RECRUITING' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type RecruitmentType = 'OPEN' | 'APPROVAL';
export type ParticipationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ShopItemType = 'GONGGU' | 'PICK';
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPING' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
export type ConversionType = 'DIRECT' | 'INDIRECT';
export type ConversionStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type SettlementStatus = 'PENDING' | 'COMPLETED' | 'CARRIED_OVER';
export type SkinType = 'combination' | 'dry' | 'oily' | 'normal' | 'oily_sensitive';
export type PersonalColor = 'spring_warm' | 'summer_cool' | 'autumn_warm' | 'winter_cool';
export type ProductCategory = 'skincare' | 'makeup' | 'hair' | 'body' | 'etc';
export type ProductStatus = 'ACTIVE' | 'INACTIVE';
export type ShippingFeeType = 'FREE' | 'PAID' | 'CONDITIONAL_FREE';
export type BannerType = 'HORIZONTAL' | 'VERTICAL';
export type BannerLinkType = 'EXTERNAL' | 'COLLECTION' | 'PRODUCT';
export type NotificationType = 'ORDER' | 'SHIPPING' | 'SETTLEMENT' | 'CAMPAIGN' | 'SYSTEM';
export type PointType = 'SIGNUP_BONUS' | 'PERSONA_COMPLETE' | 'FIRST_PRODUCT' | 'FIRST_SALE' | 'REFERRAL_INVITE' | 'REFERRAL_SALE' | 'WEEKLY_ACTIVE' | 'MONTHLY_TARGET' | 'WITHDRAW' | 'ADMIN_ADJUST';
export type ReferralStatus = 'PENDING' | 'SIGNUP_COMPLETE' | 'FIRST_SALE_COMPLETE';
export type CreatorGrade = 'ROOKIE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type GuideCategory = 'CREATOR_BEGINNER' | 'CREATOR_SALES' | 'BRAND_START' | 'BRAND_OPTIMIZE';
export type GuideContentType = 'CARD' | 'VIDEO' | 'ARTICLE';
export type GuideTargetGrade = 'ALL' | 'SILVER' | 'GOLD' | 'PLATINUM';

// =============================================
// CORE TABLES
// =============================================

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Brand {
  id: string;
  user_id: string;
  brand_name: string;
  logo_url?: string;
  business_number?: string;
  representative_name?: string;
  business_registration_url?: string;
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
  contact_phone?: string;
  contact_email?: string;
  default_shipping_fee?: number;
  free_shipping_threshold?: number;
  default_courier?: string;
  return_address?: string;
  exchange_policy?: string;
  platform_fee_rate: number;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export type AgeRange = '10s' | '20s_early' | '20s_late' | '30s_early' | '30s_late' | '40s_plus';
export type BeautyInterest = 'skincare' | 'makeup' | 'body' | 'hair' | 'inner_beauty' | 'clean_beauty';
export type MissionKey = 'SHOP_OPEN' | 'FIRST_PRODUCT' | 'SNS_SHARE' | 'FIVE_PRODUCTS' | 'FIRST_SALE';

export interface Creator {
  id: string;
  user_id: string;
  shop_id: string; // URL slug: www.cnecshop.com/{shop_id}
  display_name: string;
  bio?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  banner_image_url?: string;
  banner_link?: string;
  instagram_handle?: string;
  youtube_handle?: string;
  tiktok_handle?: string;
  skin_type?: SkinType;
  personal_color?: PersonalColor;
  skin_concerns?: string[];
  scalp_concerns?: string[];
  age_range?: AgeRange;
  interests?: BeautyInterest[];
  onboarding_completed?: boolean;
  total_sales: number;
  total_earnings: number;
  bank_name?: string;
  bank_account?: string;
  is_business: boolean;
  business_number?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreatorMission {
  id: string;
  creator_id: string;
  mission_key: MissionKey;
  is_completed: boolean;
  completed_at?: string;
  reward_amount: number;
  reward_claimed: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  brand_id: string;
  name: string;
  category: ProductCategory;
  description?: string;
  original_price: number;
  sale_price: number;
  stock: number;
  images: string[];
  thumbnail_url?: string;
  volume?: string;
  ingredients?: string;
  how_to_use?: string;
  shipping_fee_type: ShippingFeeType;
  shipping_fee?: number;
  free_shipping_threshold?: number;
  courier?: string;
  shipping_info?: string;
  return_policy?: string;
  status: ProductStatus;
  allow_creator_pick: boolean;
  default_commission_rate: number;
  created_at: string;
  updated_at?: string;
  review_count?: number;
  average_rating?: number;
  // Joined
  brand?: Brand;
}

// =============================================
// CAMPAIGN TABLES
// =============================================

export interface Campaign {
  id: string;
  brand_id: string;
  type: CampaignType;
  title: string;
  description?: string;
  status: CampaignStatus;
  start_at?: string;
  end_at?: string;
  recruitment_type: RecruitmentType;
  commission_rate: number;
  total_stock?: number;
  sold_count: number;
  target_participants?: number;
  conditions?: string;
  created_at: string;
  updated_at?: string;
  // Joined
  brand?: Brand;
  products?: CampaignProduct[];
  participants?: CampaignParticipation[];
  promotion_kit?: PromotionKit;
}

export interface CampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  campaign_price: number;
  per_creator_limit?: number;
  // Joined
  product?: Product;
  campaign?: Campaign;
}

export interface CampaignParticipation {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: ParticipationStatus;
  message?: string;
  applied_at: string;
  approved_at?: string;
  // Joined
  campaign?: Campaign;
  creator?: Creator;
}

// =============================================
// CREATOR SHOP TABLES
// =============================================

export interface CreatorShopItem {
  id: string;
  creator_id: string;
  product_id: string;
  campaign_id?: string;
  type: ShopItemType;
  collection_id?: string;
  display_order: number;
  is_visible: boolean;
  added_at: string;
  // Joined
  product?: Product;
  campaign?: Campaign;
  campaign_product?: CampaignProduct;
}

export interface Collection {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  // Joined
  items?: CreatorShopItem[];
}

export interface BeautyRoutine {
  id: string;
  creator_id: string;
  name: string;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  // Joined
  steps?: RoutineStep[];
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  step_name: string;
  step_description: string;
  image_url?: string;
  link_url?: string;
  product_tags?: { product_id: string; x: number; y: number }[];
  display_order: number;
  // Joined
  product?: Product;
}

export interface Banner {
  id: string;
  creator_id: string;
  image_url: string;
  banner_type: BannerType;
  link_url?: string;
  link_type: BannerLinkType;
  is_visible: boolean;
  display_order: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

// =============================================
// ORDER TABLES
// =============================================

export interface Order {
  id: string;
  order_number: string;
  creator_id: string;
  brand_id: string;
  buyer_id?: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  shipping_address: string;
  shipping_detail?: string;
  shipping_zipcode?: string;
  shipping_memo?: string;
  total_amount: number;
  product_amount?: number;
  shipping_fee: number;
  payment_method?: string;
  pg_transaction_id?: string;
  pg_provider?: string;
  status: OrderStatus;
  courier_code?: string;
  tracking_number?: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
  updated_at?: string;
  // Joined
  items?: OrderItem[];
  creator?: Creator;
  brand?: Brand;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  campaign_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Joined
  product?: Product;
  campaign?: Campaign;
}

// =============================================
// CONVERSION & COMMISSION
// =============================================

export interface Conversion {
  id: string;
  order_id: string;
  order_item_id: string;
  creator_id: string;
  conversion_type: ConversionType;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: ConversionStatus;
  created_at: string;
  confirmed_at?: string;
}

// =============================================
// SETTLEMENT
// =============================================

export interface Settlement {
  id: string;
  creator_id: string;
  period_start: string;
  period_end: string;
  total_conversions: number;
  total_sales: number;
  direct_commission: number;
  indirect_commission: number;
  gross_commission: number;
  withholding_tax: number;
  net_amount: number;
  status: SettlementStatus;
  paid_at?: string;
  created_at: string;
  // Joined
  creator?: Creator;
}

// =============================================
// TRACKING
// =============================================

export interface ShopVisit {
  id: string;
  creator_id: string;
  visitor_id: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  attribution_data?: Record<string, string>;
  visited_at: string;
  expires_at: string;
}

// =============================================
// PROMOTION KIT
// =============================================

export interface PromotionKit {
  id: string;
  campaign_id: string;
  product_images: string[];
  story_templates: string[];
  recommended_caption?: string;
  hashtags: string[];
}

// =============================================
// POINTS / REFERRALS / GRADES / GUIDES
// =============================================

export interface CreatorPoint {
  id: string;
  creator_id: string;
  point_type: PointType;
  amount: number;
  balance_after: number;
  description?: string;
  related_id?: string;
  created_at: string;
}

export interface CreatorReferral {
  id: string;
  referrer_id: string;
  referred_id?: string;
  referral_code: string;
  status: ReferralStatus;
  referrer_reward_total: number;
  referred_reward_total: number;
  created_at: string;
  updated_at?: string;
}

export interface CreatorGradeRecord {
  id: string;
  creator_id: string;
  grade: CreatorGrade;
  monthly_sales: number;
  commission_bonus_rate: number;
  grade_updated_at?: string;
  created_at: string;
}

export interface GuideSection {
  type: 'heading' | 'paragraph' | 'tip' | 'image';
  text?: string;
  url?: string;
  alt?: string;
}

export interface Guide {
  id: string;
  title: string;
  category: GuideCategory;
  content_type: GuideContentType;
  content: { sections: GuideSection[] };
  target_grade: GuideTargetGrade;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

// =============================================
// DASHBOARD STATS
// =============================================

export interface BrandDashboardStats {
  total_visits: number;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  conversion_rate: number;
  active_campaigns: number;
  active_creators: number;
  product_count: number;
}

export interface CreatorDashboardStats {
  total_visits: number;
  total_orders: number;
  total_revenue: number;
  total_earnings: number;
  conversion_rate: number;
  pending_settlement: number;
  active_gonggu: number;
  active_picks: number;
}

export interface AdminDashboardStats {
  total_brands: number;
  total_creators: number;
  total_orders: number;
  total_gmv: number;
  total_commission: number;
  pending_settlements: number;
}

// =============================================
// COMMISSION CONSTANTS
// =============================================

export const INDIRECT_COMMISSION_RATE = 0.03; // 3%
export const COOKIE_WINDOW_HOURS = 24;
export const PLATFORM_FEE_RATE = 0.03; // 3-5%, default 3%
export const WITHHOLDING_TAX_RATE = 0.033; // 3.3% for non-business individuals

export const POINT_AMOUNTS = {
  SIGNUP_BONUS: 3000,
  PERSONA_COMPLETE: 2000,
  FIRST_PRODUCT: 1000,
  FIRST_SALE: 5000,
  REFERRAL_INVITE: 5000,
  REFERRAL_INVITED: 3000,
  REFERRAL_SALE: 3000,
  WEEKLY_ACTIVE: 1000,
} as const;

export const GRADE_THRESHOLDS: Record<CreatorGrade, number> = {
  ROOKIE: 0,
  SILVER: 100000,
  GOLD: 500000,
  PLATINUM: 2000000,
};

export const GRADE_LABELS: Record<CreatorGrade, string> = {
  ROOKIE: '루키',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
};

export const POINT_TYPE_LABELS: Record<PointType, string> = {
  SIGNUP_BONUS: '가입 축하',
  PERSONA_COMPLETE: '페르소나 완료',
  FIRST_PRODUCT: '첫 상품 추가',
  FIRST_SALE: '첫 판매',
  REFERRAL_INVITE: '친구 초대',
  REFERRAL_SALE: '친구 첫 판매',
  WEEKLY_ACTIVE: '주간 활동 보상',
  MONTHLY_TARGET: '월간 목표 달성',
  WITHDRAW: '출금',
  ADMIN_ADJUST: '관리자 조정',
};

export const MISSION_LABELS: Record<MissionKey, string> = {
  SHOP_OPEN: '샵 개설',
  FIRST_PRODUCT: '첫 상품 추가',
  SNS_SHARE: 'SNS 공유',
  FIVE_PRODUCTS: '상품 5개 추가',
  FIRST_SALE: '첫 판매 달성',
};

export const MISSION_DAY: Record<MissionKey, number> = {
  SHOP_OPEN: 1,
  FIRST_PRODUCT: 3,
  SNS_SHARE: 7,
  FIVE_PRODUCTS: 14,
  FIRST_SALE: 30,
};

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  '10s': '10대',
  '20s_early': '20대 초반',
  '20s_late': '20대 후반',
  '30s_early': '30대 초반',
  '30s_late': '30대 후반',
  '40s_plus': '40대+',
};

export const BEAUTY_INTEREST_LABELS: Record<BeautyInterest, string> = {
  skincare: '스킨케어',
  makeup: '메이크업',
  body: '바디',
  hair: '헤어',
  inner_beauty: '이너뷰티',
  clean_beauty: '클린뷰티',
};

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  CREATOR_BEGINNER: '크리에이터 시작',
  CREATOR_SALES: '판매 노하우',
  BRAND_START: '브랜드 시작',
  BRAND_OPTIMIZE: '브랜드 최적화',
};

// =============================================
// SKIN TYPE / PERSONAL COLOR LABELS
// =============================================

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  combination: '복합성',
  dry: '건성',
  oily: '지성',
  normal: '중성',
  oily_sensitive: '수부지',
};

export const PERSONAL_COLOR_LABELS: Record<PersonalColor, string> = {
  spring_warm: '봄웜',
  summer_cool: '여름쿨',
  autumn_warm: '가을웜',
  winter_cool: '겨울쿨',
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  skincare: '스킨케어',
  makeup: '메이크업',
  hair: '헤어',
  body: '바디',
  etc: '기타',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: '결제대기',
  PAID: '결제완료',
  PREPARING: '배송준비',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  CONFIRMED: '구매확정',
  CANCELLED: '취소',
  REFUNDED: '환불',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: '작성중',
  RECRUITING: '모집중',
  ACTIVE: '진행중',
  PAUSED: '일시중단',
  ENDED: '종료',
};

export const SHIPPING_FEE_TYPE_LABELS: Record<ShippingFeeType, string> = {
  FREE: '무료배송',
  PAID: '유료배송',
  CONDITIONAL_FREE: '조건부 무료',
};

export const COURIER_LABELS: Record<string, string> = {
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  logen: '로젠택배',
  epost: '우체국택배',
  lotte: '롯데택배',
  etc: '기타',
};

