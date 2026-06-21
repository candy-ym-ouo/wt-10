const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  AUDITOR: 'auditor',
  USER: 'user'
};

const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  USER_MANAGE: 'user:manage',
  USER_VIEW: 'user:view',
  PATCH_MANAGE: 'patch:manage',
  PATCH_VIEW: 'patch:view',
  PATCH_REVIEW: 'patch:review',
  MODULE_MANAGE: 'module:manage',
  MODULE_VIEW: 'module:view',
  ARTICLE_MANAGE: 'article:manage',
  ARTICLE_VIEW: 'article:view',
  ARTICLE_REVIEW: 'article:review',
  MANUFACTURER_MANAGE: 'manufacturer:manage',
  MANUFACTURER_VIEW: 'manufacturer:view',
  COLLECTION_MANAGE: 'collection:manage',
  COLLECTION_VIEW: 'collection:view',
  ACTIVITY_MANAGE: 'activity:manage',
  ACTIVITY_VIEW: 'activity:view',
  CHALLENGE_MANAGE: 'challenge:manage',
  CHALLENGE_VIEW: 'challenge:view',
  CREATOR_VERIFICATION_MANAGE: 'creator_verification:manage',
  CREATOR_VERIFICATION_VIEW: 'creator_verification:view',
  DOWNLOAD_MANAGE: 'download:manage',
  DOWNLOAD_VIEW: 'download:view',
  DOWNLOAD_REVIEW: 'download:review',
  DOWNLOAD_RECORD_VIEW: 'download_record:view',
  REPORT_VIEW: 'report:view',
  REPORT_MANAGE: 'report:manage',
  CONTENT_REPORT_VIEW: 'content_report:view',
  CONTENT_REPORT_HANDLE: 'content_report:handle',
  PRODUCT_MANAGE: 'product:manage',
  PRODUCT_VIEW: 'product:view',
  ORDER_MANAGE: 'order:manage',
  ORDER_VIEW: 'order:view',
  WITHDRAWAL_MANAGE: 'withdrawal:manage',
  WITHDRAWAL_VIEW: 'withdrawal:view',
  WITHDRAWAL_REVIEW: 'withdrawal:review',
  OPEN_PLATFORM_MANAGE: 'open_platform:manage',
  OPEN_PLATFORM_VIEW: 'open_platform:view',
  API_CALL_LOG_VIEW: 'api_call_log:view',
  ROLE_MANAGE: 'role:manage',
  AUDIT_LOG_VIEW: 'audit_log:view',
  SEARCH_MANAGE: 'search:manage',
  SEARCH_VIEW: 'search:view',
  I18N_MANAGE: 'i18n:manage',
  I18N_VIEW: 'i18n:view',
  ACHIEVEMENT_MANAGE: 'achievement:manage',
  ACHIEVEMENT_VIEW: 'achievement:view',
  TAG_MANAGE: 'tag:manage',
  TAG_VIEW: 'tag:view'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.OPERATOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.PATCH_VIEW,
    PERMISSIONS.PATCH_MANAGE,
    PERMISSIONS.MODULE_VIEW,
    PERMISSIONS.MODULE_MANAGE,
    PERMISSIONS.ARTICLE_VIEW,
    PERMISSIONS.ARTICLE_MANAGE,
    PERMISSIONS.MANUFACTURER_VIEW,
    PERMISSIONS.MANUFACTURER_MANAGE,
    PERMISSIONS.COLLECTION_VIEW,
    PERMISSIONS.COLLECTION_MANAGE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.ACTIVITY_MANAGE,
    PERMISSIONS.CHALLENGE_VIEW,
    PERMISSIONS.CHALLENGE_MANAGE,
    PERMISSIONS.CREATOR_VERIFICATION_VIEW,
    PERMISSIONS.DOWNLOAD_VIEW,
    PERMISSIONS.DOWNLOAD_MANAGE,
    PERMISSIONS.DOWNLOAD_RECORD_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.CONTENT_REPORT_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.WITHDRAWAL_VIEW,
    PERMISSIONS.OPEN_PLATFORM_VIEW,
    PERMISSIONS.API_CALL_LOG_VIEW,
    PERMISSIONS.SEARCH_VIEW,
    PERMISSIONS.SEARCH_MANAGE,
    PERMISSIONS.I18N_VIEW,
    PERMISSIONS.I18N_MANAGE,
    PERMISSIONS.ACHIEVEMENT_VIEW,
    PERMISSIONS.ACHIEVEMENT_MANAGE,
    PERMISSIONS.TAG_VIEW,
    PERMISSIONS.TAG_MANAGE
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.PATCH_VIEW,
    PERMISSIONS.PATCH_REVIEW,
    PERMISSIONS.MODULE_VIEW,
    PERMISSIONS.ARTICLE_VIEW,
    PERMISSIONS.ARTICLE_REVIEW,
    PERMISSIONS.MANUFACTURER_VIEW,
    PERMISSIONS.COLLECTION_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.CHALLENGE_VIEW,
    PERMISSIONS.CREATOR_VERIFICATION_VIEW,
    PERMISSIONS.CREATOR_VERIFICATION_MANAGE,
    PERMISSIONS.DOWNLOAD_VIEW,
    PERMISSIONS.DOWNLOAD_REVIEW,
    PERMISSIONS.DOWNLOAD_RECORD_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.CONTENT_REPORT_VIEW,
    PERMISSIONS.CONTENT_REPORT_HANDLE,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.WITHDRAWAL_VIEW,
    PERMISSIONS.WITHDRAWAL_REVIEW,
    PERMISSIONS.OPEN_PLATFORM_VIEW,
    PERMISSIONS.API_CALL_LOG_VIEW,
    PERMISSIONS.SEARCH_VIEW,
    PERMISSIONS.I18N_VIEW,
    PERMISSIONS.ACHIEVEMENT_VIEW,
    PERMISSIONS.TAG_VIEW
  ],
  [ROLES.USER]: []
};

const ROLE_LABELS = {
  [ROLES.ADMIN]: '管理员',
  [ROLES.OPERATOR]: '运营',
  [ROLES.AUDITOR]: '审核员',
  [ROLES.USER]: '普通用户'
};

const isAdminRole = (role) => role === ROLES.ADMIN;
const isOperatorRole = (role) => role === ROLES.OPERATOR;
const isAuditorRole = (role) => role === ROLES.AUDITOR;

const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

const hasAnyPermission = (role, permissions) => {
  return permissions.some(p => hasPermission(role, p));
};

const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role;
};

const isStaffRole = (role) => {
  return [ROLES.ADMIN, ROLES.OPERATOR, ROLES.AUDITOR].includes(role);
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  isAdminRole,
  isOperatorRole,
  isAuditorRole,
  hasPermission,
  hasAnyPermission,
  getRolePermissions,
  getRoleLabel,
  isStaffRole
};
