const Router = require('koa-router');
const multer = require('koa-multer');
const path = require('path');
const { requireAuth, requireAdmin, requireSuperAdmin, requirePermission, requireAnyPermission } = require('./middleware/auth');
const { PERMISSIONS } = require('./constants/permissions');
const { getAuditLogs, getAuditLogById } = require('./middleware/audit');

const userController = require('./controllers/userController');
const moduleController = require('./controllers/moduleController');
const patchController = require('./controllers/patchController');
const socialController = require('./controllers/socialController');
const adminController = require('./controllers/adminController');
const collectionController = require('./controllers/collectionController');
const activityController = require('./controllers/activityController');
const challengeController = require('./controllers/challengeController');
const wikiController = require('./controllers/wikiController');
const creatorVerificationController = require('./controllers/creatorVerificationController');
const downloadController = require('./controllers/downloadController');
const reportController = require('./controllers/reportController');
const contentReportController = require('./controllers/contentReportController');
const moduleRecommendationController = require('./controllers/moduleRecommendationController');
const productController = require('./controllers/productController');
const orderController = require('./controllers/orderController');
const earningsController = require('./controllers/earningsController');
const articleController = require('./controllers/articleController');
const openPlatformController = require('./controllers/openPlatformController');
const patchLabController = require('./controllers/patchLabController');
const { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, getRoleLabel, isStaffRole } = require('./constants/permissions');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${randomStr}${ext}`);
  }
});
const upload = multer({ storage: storage });

const router = new Router({ prefix: '/api' });

router.get('/', (ctx) => {
  ctx.body = { message: 'Patch Vault API v1.0', status: 'running' };
});

router.post('/auth/register', userController.register);
router.post('/auth/login', userController.login);
router.get('/auth/me', requireAuth, userController.currentUser);
router.put('/auth/profile', requireAuth, userController.updateProfile);
router.get('/users/:id', userController.profile);

router.get('/manufacturers', moduleController.getManufacturers);
router.get('/modules', moduleController.getModules);
router.get('/modules/:id', moduleController.getModuleDetail);
router.get('/modules/:id/wiki', wikiController.getModuleWiki);
router.get('/modules/:id/parameters', wikiController.getModuleParameters);
router.get('/modules/:id/tips', wikiController.getModuleTips);
router.get('/modules/:id/recommended-patches', wikiController.getRecommendedPatches);
router.get('/modules/:id/recommended-combinations', moduleRecommendationController.getRecommendedCombinations);
router.get('/modules/:id/combination-patches/:pairedId', moduleRecommendationController.getCombinationPatches);
router.get('/modules/:id/combination-stats', moduleRecommendationController.getModuleStats);
router.get('/modules/combinations/popular', moduleRecommendationController.getPopularCombinations);
router.post('/manufacturers', requirePermission(PERMISSIONS.MANUFACTURER_MANAGE), moduleController.createManufacturer);
router.post('/modules', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleController.createModule);
router.put('/modules/:id', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleController.updateModule);
router.delete('/modules/:id', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleController.deleteModule);

router.get('/patches', patchController.getPatches);
router.get('/patches/:id', patchController.getPatchDetail);
router.post('/patches', requireAuth, patchController.createPatch);
router.put('/patches/:id', requireAuth, patchController.updatePatch);
router.delete('/patches/:id', requireAuth, patchController.deletePatch);
router.post('/patches/:id/comments', requireAuth, patchController.addComment);
router.delete('/patches/:id/comments/:commentId', requireAuth, patchController.deleteComment);

router.get('/articles', articleController.getArticles);
router.get('/articles/:id', articleController.getArticleDetail);
router.get('/articles/:id/module-refs', articleController.getModuleRefs);
router.post('/articles', requireAuth, articleController.createArticle);
router.put('/articles/:id', requireAuth, articleController.updateArticle);
router.delete('/articles/:id', requireAuth, articleController.deleteArticle);
router.post('/articles/:id/like', requireAuth, articleController.toggleLike);
router.post('/articles/:id/favorite', requireAuth, articleController.toggleFavorite);
router.post('/articles/:id/comments', requireAuth, articleController.addComment);
router.delete('/articles/:id/comments/:commentId', requireAuth, articleController.deleteComment);
router.get('/me/articles', requireAuth, articleController.getMyArticles);

router.post('/patches/:id/like', requireAuth, socialController.toggleLike);
router.post('/patches/:id/favorite', requireAuth, socialController.toggleFavorite);
router.get('/me/favorites', requireAuth, socialController.getMyFavorites);
router.get('/me/patches', requireAuth, socialController.getMyPatches);
router.get('/me/drafts', requireAuth, socialController.getMyDrafts);
router.get('/me/stats', requireAuth, socialController.getCreatorStats);
router.get('/me/notifications', requireAuth, socialController.getMyNotifications);
router.put('/me/notifications/:id/read', requireAuth, socialController.markNotificationRead);
router.post('/me/notifications/read-all', requireAuth, socialController.markAllNotificationsRead);
router.post('/me/notifications/read-batch', requireAuth, socialController.markBatchNotificationsRead);
router.delete('/me/notifications/:id', requireAuth, socialController.deleteNotification);
router.post('/me/notifications/delete-batch', requireAuth, socialController.deleteBatchNotifications);
router.post('/me/notifications/clear-read', requireAuth, socialController.clearReadNotifications);

router.get('/me/notification-subscriptions', requireAuth, socialController.getNotificationSubscriptions);
router.put('/me/notification-subscriptions', requireAuth, socialController.updateNotificationSubscription);
router.put('/me/notification-subscriptions/batch', requireAuth, socialController.updateNotificationSubscriptionsBatch);

router.post('/users/:id/follow', requireAuth, socialController.followUser);
router.get('/users/:id/follow-status', requireAuth, socialController.checkFollowStatus);
router.get('/users/:id/followers', socialController.getFollowers);
router.get('/users/:id/following', socialController.getFollowing);

router.get('/me/followers', requireAuth, socialController.getMyFollowers);
router.get('/me/following', requireAuth, socialController.getMyFollowing);
router.get('/me/feed', requireAuth, socialController.getFollowingFeed);

router.get('/compare', requireAuth, socialController.getCompareList);
router.post('/compare/:id', requireAuth, socialController.addToCompare);
router.delete('/compare/:id', requireAuth, socialController.removeFromCompare);
router.post('/compare/clear', requireAuth, socialController.clearCompare);
router.get('/compare/result', socialController.comparePatches);

router.get('/collections', collectionController.getCollections);
router.get('/collections/:id', collectionController.getCollectionDetail);

router.get('/admin/stats', requirePermission(PERMISSIONS.DASHBOARD_VIEW), adminController.getStats);
router.get('/admin/users/recent', requirePermission(PERMISSIONS.USER_VIEW), adminController.getRecentUsers);
router.get('/admin/users', requirePermission(PERMISSIONS.USER_VIEW), adminController.getUsers);
router.put('/admin/users/:id', requirePermission(PERMISSIONS.USER_MANAGE), adminController.updateUser);
router.delete('/admin/users/:id', requirePermission(PERMISSIONS.USER_MANAGE), adminController.deleteUser);
router.get('/admin/patches/recent', requirePermission(PERMISSIONS.PATCH_VIEW), adminController.getRecentPatches);
router.get('/admin/patches', requirePermission(PERMISSIONS.PATCH_VIEW), adminController.getAllPatches);
router.put('/admin/patches/:id/status', requireAnyPermission([PERMISSIONS.PATCH_REVIEW, PERMISSIONS.PATCH_MANAGE]), adminController.updatePatchStatus);
router.put('/admin/patches/:id/public', requirePermission(PERMISSIONS.PATCH_MANAGE), adminController.togglePatchPublic);
router.delete('/admin/patches/:id', requirePermission(PERMISSIONS.PATCH_MANAGE), adminController.adminDeletePatch);
router.get('/admin/modules', requirePermission(PERMISSIONS.MODULE_VIEW), adminController.getAllModules);
router.post('/admin/modules', requirePermission(PERMISSIONS.MODULE_MANAGE), adminController.createModule);
router.put('/admin/modules/:id', requirePermission(PERMISSIONS.MODULE_MANAGE), adminController.updateModule);
router.get('/admin/modules/:id/wiki', requirePermission(PERMISSIONS.MODULE_VIEW), wikiController.adminGetWiki);
router.post('/admin/modules/:id/wiki', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminSaveWiki);
router.post('/admin/modules/:id/parameters', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminCreateParameter);
router.put('/admin/modules/:id/parameters/:paramId', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminUpdateParameter);
router.delete('/admin/modules/:id/parameters/:paramId', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminDeleteParameter);
router.put('/admin/modules/:id/parameters/reorder', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminReorderParameters);
router.post('/admin/modules/:id/tips', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminCreateTip);
router.put('/admin/modules/:id/tips/:tipId', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminUpdateTip);
router.delete('/admin/modules/:id/tips/:tipId', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminDeleteTip);
router.put('/admin/modules/:id/tips/reorder', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminReorderTips);
router.post('/admin/modules/:id/recommended-patches', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminAddRecommendedPatch);
router.put('/admin/modules/:id/recommended-patches/:recId', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminUpdateRecommendedPatch);
router.delete('/admin/modules/:id/recommended-patches/:recId', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminRemoveRecommendedPatch);
router.put('/admin/modules/:id/recommended-patches/reorder', requirePermission(PERMISSIONS.MODULE_MANAGE), wikiController.adminReorderRecommendedPatches);
router.get('/admin/patches/search', requirePermission(PERMISSIONS.PATCH_VIEW), wikiController.adminSearchPatches);
router.get('/admin/articles', requirePermission(PERMISSIONS.ARTICLE_VIEW), articleController.adminGetArticles);
router.get('/admin/articles/:id', requirePermission(PERMISSIONS.ARTICLE_VIEW), articleController.adminGetArticleDetail);
router.put('/admin/articles/:id/review', requireAnyPermission([PERMISSIONS.ARTICLE_REVIEW, PERMISSIONS.ARTICLE_MANAGE]), articleController.adminReviewArticle);
router.put('/admin/articles/:id/public', requirePermission(PERMISSIONS.ARTICLE_MANAGE), articleController.adminToggleArticlePublic);
router.delete('/admin/articles/:id', requirePermission(PERMISSIONS.ARTICLE_MANAGE), articleController.adminDeleteArticle);
router.get('/admin/manufacturers', requirePermission(PERMISSIONS.MANUFACTURER_VIEW), adminController.getAllManufacturers);
router.post('/admin/manufacturers', requirePermission(PERMISSIONS.MANUFACTURER_MANAGE), adminController.createManufacturer);
router.put('/admin/manufacturers/:id', requirePermission(PERMISSIONS.MANUFACTURER_MANAGE), adminController.updateManufacturer);
router.delete('/admin/manufacturers/:id', requirePermission(PERMISSIONS.MANUFACTURER_MANAGE), adminController.deleteManufacturer);

router.get('/admin/modules/combinations/stats', requirePermission(PERMISSIONS.MODULE_VIEW), moduleRecommendationController.adminGetCombinationStatsList);
router.get('/admin/modules/:id/combinations', requirePermission(PERMISSIONS.MODULE_VIEW), moduleRecommendationController.adminGetRecommendedCombinations);
router.post('/admin/modules/:id/combinations', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.adminAddRecommendedCombination);
router.put('/admin/modules/combinations/:comboId', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.adminUpdateRecommendedCombination);
router.delete('/admin/modules/combinations/:comboId', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.adminRemoveRecommendedCombination);
router.put('/admin/modules/:id/combinations/reorder', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.adminReorderRecommendedCombinations);
router.post('/admin/modules/combinations/recalculate', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.recalculateStats);
router.get('/admin/modules/combinations/config', requirePermission(PERMISSIONS.MODULE_VIEW), moduleRecommendationController.getConfig);
router.put('/admin/modules/combinations/config', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.updateConfig);
router.post('/admin/modules/combinations/config/batch', requirePermission(PERMISSIONS.MODULE_MANAGE), moduleRecommendationController.batchUpdateConfig);

router.get('/admin/collections', requirePermission(PERMISSIONS.COLLECTION_VIEW), collectionController.adminGetCollections);
router.post('/admin/collections', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.createCollection);
router.put('/admin/collections/reorder', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.reorderCollections);
router.put('/admin/collections/:id', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.updateCollection);
router.delete('/admin/collections/:id', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.deleteCollection);
router.post('/admin/collections/:id/patches', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.addPatchToCollection);
router.put('/admin/collections/:id/patches/:patchId', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.updatePatchNote);
router.delete('/admin/collections/:id/patches/:patchId', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.removePatchFromCollection);
router.put('/admin/collections/:id/reorder', requirePermission(PERMISSIONS.COLLECTION_MANAGE), collectionController.reorderPatches);

router.get('/activities', activityController.getActivities);
router.get('/activities/:id', activityController.getActivityDetail);
router.get('/activities/:id/submissions', activityController.getActivitySubmissions);
router.get('/activities/:id/rankings', activityController.getActivityRankings);
router.post('/activities/:id/register', requireAuth, activityController.registerActivity);
router.delete('/activities/:id/register', requireAuth, activityController.cancelRegistration);
router.post('/activities/:id/submit', requireAuth, activityController.submitWork);
router.get('/activities/submissions/:id', activityController.getSubmissionDetail);
router.post('/activities/submissions/:id/vote', requireAuth, activityController.voteSubmission);

router.get('/me/activities/registrations', requireAuth, activityController.getMyRegistrations);
router.get('/me/activities/submissions', requireAuth, activityController.getMySubmissions);

router.get('/admin/activities', requirePermission(PERMISSIONS.ACTIVITY_VIEW), activityController.adminGetActivities);
router.post('/admin/activities', requirePermission(PERMISSIONS.ACTIVITY_MANAGE), activityController.adminCreateActivity);
router.put('/admin/activities/:id', requirePermission(PERMISSIONS.ACTIVITY_MANAGE), activityController.adminUpdateActivity);
router.delete('/admin/activities/:id', requirePermission(PERMISSIONS.ACTIVITY_MANAGE), activityController.adminDeleteActivity);
router.get('/admin/activities/:id/registrations', requirePermission(PERMISSIONS.ACTIVITY_VIEW), activityController.adminGetRegistrations);
router.put('/admin/activities/registrations/:id/status', requirePermission(PERMISSIONS.ACTIVITY_MANAGE), activityController.adminUpdateRegistrationStatus);
router.get('/admin/activities/:id/submissions', requirePermission(PERMISSIONS.ACTIVITY_VIEW), activityController.adminGetSubmissions);
router.put('/admin/activities/submissions/:id/review', requirePermission(PERMISSIONS.ACTIVITY_MANAGE), activityController.adminReviewSubmission);
router.delete('/admin/activities/submissions/:id', requirePermission(PERMISSIONS.ACTIVITY_MANAGE), activityController.adminDeleteSubmission);

router.get('/challenge/seasons', challengeController.getSeasons);
router.get('/challenge/seasons/:id', challengeController.getSeasonDetail);
router.get('/challenge/seasons/:id/overview', challengeController.getSeasonOverview);
router.get('/challenge/voting-rule', challengeController.getVotingRule);
router.get('/challenge/awards', challengeController.getAwards);
router.get('/challenge/jury', challengeController.getJury);
router.get('/challenge/winners', challengeController.getWinners);
router.get('/challenge/rankings', challengeController.getRankings);
router.get('/challenge/snapshots', challengeController.getResultSnapshot);

router.post('/challenge/submissions/:id/vote', requireAuth, challengeController.enhancedVote);
router.post('/challenge/submissions/:id/jury-score', requireAuth, challengeController.submitJuryScore);
router.get('/challenge/jury/pending', requireAuth, challengeController.getPendingJuryReviews);

router.get('/admin/challenge/seasons', requirePermission(PERMISSIONS.CHALLENGE_VIEW), challengeController.adminGetSeasons);
router.post('/admin/challenge/seasons', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminCreateSeason);
router.put('/admin/challenge/seasons/:id', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminUpdateSeason);
router.delete('/admin/challenge/seasons/:id', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminDeleteSeason);

router.post('/admin/challenge/voting-rule', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminSaveVotingRule);
router.post('/admin/challenge/awards', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminSaveAwards);
router.post('/admin/challenge/jury/:action', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminManageJury);

router.post('/admin/challenge/activities/:id/calculate-rankings', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.calculateRankings);
router.post('/admin/challenge/activities/:id/publish-results', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.publishResults);
router.post('/admin/challenge/winners/assign', requirePermission(PERMISSIONS.CHALLENGE_MANAGE), challengeController.adminAssignWinner);

router.post('/creator/verification', requireAuth, creatorVerificationController.submitVerification);
router.get('/creator/verification/status', requireAuth, creatorVerificationController.getMyVerificationStatus);
router.get('/creator/verification/history', requireAuth, creatorVerificationController.getVerificationHistory);
router.get('/users/:id/verification-badge', creatorVerificationController.getUserVerificationBadge);

router.get('/admin/creator-verifications', requirePermission(PERMISSIONS.CREATOR_VERIFICATION_VIEW), creatorVerificationController.adminGetVerifications);
router.get('/admin/creator-verifications/:id', requirePermission(PERMISSIONS.CREATOR_VERIFICATION_VIEW), creatorVerificationController.adminGetVerificationDetail);
router.put('/admin/creator-verifications/:id/review', requirePermission(PERMISSIONS.CREATOR_VERIFICATION_MANAGE), creatorVerificationController.adminReviewVerification);

router.get('/downloads/stats', downloadController.getStats);
router.get('/downloads', downloadController.getResourceList);
router.get('/downloads/:id', downloadController.getResourceDetail);
router.get('/downloads/:id/download', downloadController.downloadResource);
router.post('/downloads', requireAuth, upload.single('file'), downloadController.uploadResource);
router.get('/me/downloads', requireAuth, downloadController.getMyResources);
router.delete('/me/downloads/:id', requireAuth, downloadController.deleteMyResource);
router.get('/me/download-records', requireAuth, downloadController.getMyDownloadRecords);

router.get('/admin/downloads', requirePermission(PERMISSIONS.DOWNLOAD_VIEW), downloadController.adminGetResources);
router.put('/admin/downloads/:id/review', requireAnyPermission([PERMISSIONS.DOWNLOAD_REVIEW, PERMISSIONS.DOWNLOAD_MANAGE]), downloadController.adminReviewResource);
router.delete('/admin/downloads/:id', requirePermission(PERMISSIONS.DOWNLOAD_MANAGE), downloadController.adminDeleteResource);
router.get('/admin/download-records', requirePermission(PERMISSIONS.DOWNLOAD_RECORD_VIEW), downloadController.adminGetDownloadRecords);

router.get('/admin/reports/overview', requirePermission(PERMISSIONS.REPORT_VIEW), reportController.getOverview);
router.get('/admin/reports/users', requirePermission(PERMISSIONS.REPORT_VIEW), reportController.getUserStats);
router.get('/admin/reports/patches', requirePermission(PERMISSIONS.REPORT_VIEW), reportController.getPatchStats);
router.get('/admin/reports/modules', requirePermission(PERMISSIONS.REPORT_VIEW), reportController.getModuleStats);
router.get('/admin/reports/manufacturers', requirePermission(PERMISSIONS.REPORT_VIEW), reportController.getManufacturerStats);
router.get('/admin/reports/export', requirePermission(PERMISSIONS.REPORT_MANAGE), reportController.exportReport);

router.get('/report/categories', contentReportController.getReportCategories);
router.post('/reports', requireAuth, contentReportController.createReport);
router.get('/me/reports', requireAuth, contentReportController.getMyReports);
router.get('/admin/reports/content', requirePermission(PERMISSIONS.CONTENT_REPORT_VIEW), contentReportController.adminGetReports);
router.get('/admin/reports/content/:id', requirePermission(PERMISSIONS.CONTENT_REPORT_VIEW), contentReportController.adminGetReportDetail);
router.put('/admin/reports/content/:id', requirePermission(PERMISSIONS.CONTENT_REPORT_HANDLE), contentReportController.adminHandleReport);
router.post('/admin/reports/content/batch', requirePermission(PERMISSIONS.CONTENT_REPORT_HANDLE), contentReportController.adminBatchHandleReports);

router.get('/products', productController.getProductList);
router.get('/products/:id', productController.getProductDetail);
router.get('/products/patch/:patchId', productController.getProductByPatchId);
router.post('/products', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.createProduct);
router.put('/products/:id', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.updateProduct);
router.delete('/products/:id', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.deleteProduct);
router.put('/products/:id/active', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.toggleProductActive);

router.get('/admin/products', requirePermission(PERMISSIONS.PRODUCT_VIEW), productController.getProductList);
router.get('/admin/products/:id', requirePermission(PERMISSIONS.PRODUCT_VIEW), productController.getProductDetail);
router.post('/admin/products', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.createProduct);
router.put('/admin/products/:id', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.updateProduct);
router.delete('/admin/products/:id', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.deleteProduct);
router.put('/admin/products/:id/active', requirePermission(PERMISSIONS.PRODUCT_MANAGE), productController.toggleProductActive);

router.get('/me/orders', requireAuth, orderController.getMyOrders);
router.get('/me/orders/:id', requireAuth, orderController.getOrderDetail);
router.post('/orders', requireAuth, orderController.createOrder);
router.get('/patches/:patchId/permission', orderController.checkPermission);
router.get('/me/permissions', requireAuth, orderController.getMyPermissions);

router.get('/admin/orders', requirePermission(PERMISSIONS.ORDER_VIEW), orderController.getAllOrders);
router.get('/admin/orders/stats', requirePermission(PERMISSIONS.ORDER_VIEW), orderController.getOrderStats);

router.get('/me/earnings', requireAuth, earningsController.getMyEarnings);
router.get('/me/earnings/overview', requireAuth, earningsController.getEarningsOverview);
router.post('/me/withdrawals', requireAuth, earningsController.createWithdrawal);
router.get('/me/withdrawals', requireAuth, earningsController.getMyWithdrawals);

router.get('/admin/earnings/stats', requirePermission(PERMISSIONS.WITHDRAWAL_VIEW), earningsController.getEarningsStats);
router.get('/admin/withdrawals', requirePermission(PERMISSIONS.WITHDRAWAL_VIEW), earningsController.getAllWithdrawals);
router.put('/admin/withdrawals/:id/review', requirePermission(PERMISSIONS.WITHDRAWAL_REVIEW), earningsController.reviewWithdrawal);

router.get('/open-platform/scopes', openPlatformController.getScopes);
router.get('/me/api-keys', requireAuth, openPlatformController.getMyKeys);
router.post('/me/api-keys', requireAuth, openPlatformController.createApiKey);
router.put('/me/api-keys/:id', requireAuth, openPlatformController.updateApiKey);
router.delete('/me/api-keys/:id', requireAuth, openPlatformController.deleteApiKey);
router.post('/open-platform/token', requireAuth, openPlatformController.generateToken);
router.get('/me/api-call-logs', requireAuth, openPlatformController.getMyCallLogs);
router.get('/me/api-call-stats', requireAuth, openPlatformController.getCallStats);

router.get('/admin/api-keys', requirePermission(PERMISSIONS.OPEN_PLATFORM_VIEW), openPlatformController.adminGetAllKeys);
router.get('/admin/api-keys/:id', requirePermission(PERMISSIONS.OPEN_PLATFORM_VIEW), openPlatformController.adminGetKeyDetail);
router.post('/admin/api-keys/:id/ban', requirePermission(PERMISSIONS.OPEN_PLATFORM_MANAGE), openPlatformController.adminBanKey);
router.post('/admin/api-keys/:id/unban', requirePermission(PERMISSIONS.OPEN_PLATFORM_MANAGE), openPlatformController.adminUnbanKey);
router.put('/admin/api-keys/:id/rate-limit', requirePermission(PERMISSIONS.OPEN_PLATFORM_MANAGE), openPlatformController.adminUpdateRateLimit);
router.get('/admin/api-call-logs', requirePermission(PERMISSIONS.API_CALL_LOG_VIEW), openPlatformController.adminGetCallLogs);
router.get('/admin/open-platform/stats', requirePermission(PERMISSIONS.OPEN_PLATFORM_VIEW), openPlatformController.adminGetPlatformStats);

router.get('/me/lab/experiments', requireAuth, patchLabController.getMyExperiments);
router.get('/me/lab/experiments/stats', requireAuth, patchLabController.getExperimentStats);
router.get('/me/lab/experiments/:id', requireAuth, patchLabController.getExperimentDetail);
router.post('/me/lab/experiments', requireAuth, patchLabController.createExperiment);
router.put('/me/lab/experiments/:id', requireAuth, patchLabController.updateExperiment);
router.delete('/me/lab/experiments/:id', requireAuth, patchLabController.deleteExperiment);
router.post('/me/lab/experiments/:id/snapshots', requireAuth, patchLabController.createSnapshot);
router.put('/me/lab/experiments/:id/snapshots/:snapshotId', requireAuth, patchLabController.updateSnapshot);
router.delete('/me/lab/experiments/:id/snapshots/:snapshotId', requireAuth, patchLabController.deleteSnapshot);
router.post('/me/lab/experiments/:id/result', requireAuth, patchLabController.saveResult);

router.get('/admin/roles', requireAdmin, async (ctx) => {
  ctx.body = {
    roles: [
      { key: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN], permissions: ROLE_PERMISSIONS[ROLES.ADMIN] },
      { key: ROLES.OPERATOR, label: ROLE_LABELS[ROLES.OPERATOR], permissions: ROLE_PERMISSIONS[ROLES.OPERATOR] },
      { key: ROLES.AUDITOR, label: ROLE_LABELS[ROLES.AUDITOR], permissions: ROLE_PERMISSIONS[ROLES.AUDITOR] }
    ]
  };
});

router.get('/admin/audit-logs', requirePermission(PERMISSIONS.AUDIT_LOG_VIEW), async (ctx) => {
  const { page = 1, pageSize = 20, userId, action, targetType, startDate, endDate, keyword } = ctx.query;
  ctx.body = getAuditLogs({
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    userId: userId ? parseInt(userId) : null,
    action,
    targetType,
    startDate,
    endDate,
    keyword
  });
});

router.get('/admin/audit-logs/:id', requirePermission(PERMISSIONS.AUDIT_LOG_VIEW), async (ctx) => {
  const log = getAuditLogById(parseInt(ctx.params.id));
  if (!log) {
    ctx.status = 404;
    ctx.body = { error: '日志不存在' };
    return;
  }
  ctx.body = log;
});

module.exports = router;
