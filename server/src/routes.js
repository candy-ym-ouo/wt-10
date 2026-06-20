const Router = require('koa-router');
const multer = require('koa-multer');
const path = require('path');
const { requireAuth, requireAdmin } = require('./middleware/auth');

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
router.post('/manufacturers', requireAdmin, moduleController.createManufacturer);
router.post('/modules', requireAdmin, moduleController.createModule);
router.put('/modules/:id', requireAdmin, moduleController.updateModule);
router.delete('/modules/:id', requireAdmin, moduleController.deleteModule);

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

router.get('/admin/stats', requireAdmin, adminController.getStats);
router.get('/admin/users/recent', requireAdmin, adminController.getRecentUsers);
router.get('/admin/users', requireAdmin, adminController.getUsers);
router.put('/admin/users/:id', requireAdmin, adminController.updateUser);
router.delete('/admin/users/:id', requireAdmin, adminController.deleteUser);
router.get('/admin/patches/recent', requireAdmin, adminController.getRecentPatches);
router.get('/admin/patches', requireAdmin, adminController.getAllPatches);
router.put('/admin/patches/:id/status', requireAdmin, adminController.updatePatchStatus);
router.put('/admin/patches/:id/public', requireAdmin, adminController.togglePatchPublic);
router.delete('/admin/patches/:id', requireAdmin, adminController.adminDeletePatch);
router.get('/admin/modules', requireAdmin, adminController.getAllModules);
router.post('/admin/modules', requireAdmin, adminController.createModule);
router.put('/admin/modules/:id', requireAdmin, adminController.updateModule);
router.get('/admin/modules/:id/wiki', requireAdmin, wikiController.adminGetWiki);
router.post('/admin/modules/:id/wiki', requireAdmin, wikiController.adminSaveWiki);
router.post('/admin/modules/:id/parameters', requireAdmin, wikiController.adminCreateParameter);
router.put('/admin/modules/:id/parameters/:paramId', requireAdmin, wikiController.adminUpdateParameter);
router.delete('/admin/modules/:id/parameters/:paramId', requireAdmin, wikiController.adminDeleteParameter);
router.put('/admin/modules/:id/parameters/reorder', requireAdmin, wikiController.adminReorderParameters);
router.post('/admin/modules/:id/tips', requireAdmin, wikiController.adminCreateTip);
router.put('/admin/modules/:id/tips/:tipId', requireAdmin, wikiController.adminUpdateTip);
router.delete('/admin/modules/:id/tips/:tipId', requireAdmin, wikiController.adminDeleteTip);
router.put('/admin/modules/:id/tips/reorder', requireAdmin, wikiController.adminReorderTips);
router.post('/admin/modules/:id/recommended-patches', requireAdmin, wikiController.adminAddRecommendedPatch);
router.put('/admin/modules/:id/recommended-patches/:recId', requireAdmin, wikiController.adminUpdateRecommendedPatch);
router.delete('/admin/modules/:id/recommended-patches/:recId', requireAdmin, wikiController.adminRemoveRecommendedPatch);
router.put('/admin/modules/:id/recommended-patches/reorder', requireAdmin, wikiController.adminReorderRecommendedPatches);
router.get('/admin/patches/search', requireAdmin, wikiController.adminSearchPatches);
router.get('/admin/articles', requireAdmin, articleController.adminGetArticles);
router.get('/admin/articles/:id', requireAdmin, articleController.adminGetArticleDetail);
router.put('/admin/articles/:id/review', requireAdmin, articleController.adminReviewArticle);
router.put('/admin/articles/:id/public', requireAdmin, articleController.adminToggleArticlePublic);
router.delete('/admin/articles/:id', requireAdmin, articleController.adminDeleteArticle);
router.get('/admin/manufacturers', requireAdmin, adminController.getAllManufacturers);
router.post('/admin/manufacturers', requireAdmin, adminController.createManufacturer);
router.put('/admin/manufacturers/:id', requireAdmin, adminController.updateManufacturer);
router.delete('/admin/manufacturers/:id', requireAdmin, adminController.deleteManufacturer);

router.get('/admin/modules/combinations/stats', requireAdmin, moduleRecommendationController.adminGetCombinationStatsList);
router.get('/admin/modules/:id/combinations', requireAdmin, moduleRecommendationController.adminGetRecommendedCombinations);
router.post('/admin/modules/:id/combinations', requireAdmin, moduleRecommendationController.adminAddRecommendedCombination);
router.put('/admin/modules/combinations/:comboId', requireAdmin, moduleRecommendationController.adminUpdateRecommendedCombination);
router.delete('/admin/modules/combinations/:comboId', requireAdmin, moduleRecommendationController.adminRemoveRecommendedCombination);
router.put('/admin/modules/:id/combinations/reorder', requireAdmin, moduleRecommendationController.adminReorderRecommendedCombinations);
router.post('/admin/modules/combinations/recalculate', requireAdmin, moduleRecommendationController.recalculateStats);
router.get('/admin/modules/combinations/config', requireAdmin, moduleRecommendationController.getConfig);
router.put('/admin/modules/combinations/config', requireAdmin, moduleRecommendationController.updateConfig);
router.post('/admin/modules/combinations/config/batch', requireAdmin, moduleRecommendationController.batchUpdateConfig);

router.get('/admin/collections', requireAdmin, collectionController.adminGetCollections);
router.post('/admin/collections', requireAdmin, collectionController.createCollection);
router.put('/admin/collections/reorder', requireAdmin, collectionController.reorderCollections);
router.put('/admin/collections/:id', requireAdmin, collectionController.updateCollection);
router.delete('/admin/collections/:id', requireAdmin, collectionController.deleteCollection);
router.post('/admin/collections/:id/patches', requireAdmin, collectionController.addPatchToCollection);
router.put('/admin/collections/:id/patches/:patchId', requireAdmin, collectionController.updatePatchNote);
router.delete('/admin/collections/:id/patches/:patchId', requireAdmin, collectionController.removePatchFromCollection);
router.put('/admin/collections/:id/reorder', requireAdmin, collectionController.reorderPatches);

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

router.get('/admin/activities', requireAdmin, activityController.adminGetActivities);
router.post('/admin/activities', requireAdmin, activityController.adminCreateActivity);
router.put('/admin/activities/:id', requireAdmin, activityController.adminUpdateActivity);
router.delete('/admin/activities/:id', requireAdmin, activityController.adminDeleteActivity);
router.get('/admin/activities/:id/registrations', requireAdmin, activityController.adminGetRegistrations);
router.put('/admin/activities/registrations/:id/status', requireAdmin, activityController.adminUpdateRegistrationStatus);
router.get('/admin/activities/:id/submissions', requireAdmin, activityController.adminGetSubmissions);
router.put('/admin/activities/submissions/:id/review', requireAdmin, activityController.adminReviewSubmission);
router.delete('/admin/activities/submissions/:id', requireAdmin, activityController.adminDeleteSubmission);

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

router.get('/admin/challenge/seasons', requireAdmin, challengeController.adminGetSeasons);
router.post('/admin/challenge/seasons', requireAdmin, challengeController.adminCreateSeason);
router.put('/admin/challenge/seasons/:id', requireAdmin, challengeController.adminUpdateSeason);
router.delete('/admin/challenge/seasons/:id', requireAdmin, challengeController.adminDeleteSeason);

router.post('/admin/challenge/voting-rule', requireAdmin, challengeController.adminSaveVotingRule);
router.post('/admin/challenge/awards', requireAdmin, challengeController.adminSaveAwards);
router.post('/admin/challenge/jury/:action', requireAdmin, challengeController.adminManageJury);

router.post('/admin/challenge/activities/:id/calculate-rankings', requireAdmin, challengeController.calculateRankings);
router.post('/admin/challenge/activities/:id/publish-results', requireAdmin, challengeController.publishResults);
router.post('/admin/challenge/winners/assign', requireAdmin, challengeController.adminAssignWinner);

router.post('/creator/verification', requireAuth, creatorVerificationController.submitVerification);
router.get('/creator/verification/status', requireAuth, creatorVerificationController.getMyVerificationStatus);
router.get('/creator/verification/history', requireAuth, creatorVerificationController.getVerificationHistory);
router.get('/users/:id/verification-badge', creatorVerificationController.getUserVerificationBadge);

router.get('/admin/creator-verifications', requireAdmin, creatorVerificationController.adminGetVerifications);
router.get('/admin/creator-verifications/:id', requireAdmin, creatorVerificationController.adminGetVerificationDetail);
router.put('/admin/creator-verifications/:id/review', requireAdmin, creatorVerificationController.adminReviewVerification);

router.get('/downloads/stats', downloadController.getStats);
router.get('/downloads', downloadController.getResourceList);
router.get('/downloads/:id', downloadController.getResourceDetail);
router.get('/downloads/:id/download', downloadController.downloadResource);
router.post('/downloads', requireAuth, upload.single('file'), downloadController.uploadResource);
router.get('/me/downloads', requireAuth, downloadController.getMyResources);
router.delete('/me/downloads/:id', requireAuth, downloadController.deleteMyResource);
router.get('/me/download-records', requireAuth, downloadController.getMyDownloadRecords);

router.get('/admin/downloads', requireAdmin, downloadController.adminGetResources);
router.put('/admin/downloads/:id/review', requireAdmin, downloadController.adminReviewResource);
router.delete('/admin/downloads/:id', requireAdmin, downloadController.adminDeleteResource);
router.get('/admin/download-records', requireAdmin, downloadController.adminGetDownloadRecords);

router.get('/admin/reports/overview', requireAdmin, reportController.getOverview);
router.get('/admin/reports/users', requireAdmin, reportController.getUserStats);
router.get('/admin/reports/patches', requireAdmin, reportController.getPatchStats);
router.get('/admin/reports/modules', requireAdmin, reportController.getModuleStats);
router.get('/admin/reports/manufacturers', requireAdmin, reportController.getManufacturerStats);
router.get('/admin/reports/export', requireAdmin, reportController.exportReport);

router.get('/report/categories', contentReportController.getReportCategories);
router.post('/reports', requireAuth, contentReportController.createReport);
router.get('/me/reports', requireAuth, contentReportController.getMyReports);
router.get('/admin/reports/content', requireAdmin, contentReportController.adminGetReports);
router.get('/admin/reports/content/:id', requireAdmin, contentReportController.adminGetReportDetail);
router.put('/admin/reports/content/:id', requireAdmin, contentReportController.adminHandleReport);
router.post('/admin/reports/content/batch', requireAdmin, contentReportController.adminBatchHandleReports);

router.get('/products', productController.getProductList);
router.get('/products/:id', productController.getProductDetail);
router.get('/products/patch/:patchId', productController.getProductByPatchId);
router.post('/products', requireAdmin, productController.createProduct);
router.put('/products/:id', requireAdmin, productController.updateProduct);
router.delete('/products/:id', requireAdmin, productController.deleteProduct);
router.put('/products/:id/active', requireAdmin, productController.toggleProductActive);

router.get('/admin/products', requireAdmin, productController.getProductList);
router.get('/admin/products/:id', requireAdmin, productController.getProductDetail);
router.post('/admin/products', requireAdmin, productController.createProduct);
router.put('/admin/products/:id', requireAdmin, productController.updateProduct);
router.delete('/admin/products/:id', requireAdmin, productController.deleteProduct);
router.put('/admin/products/:id/active', requireAdmin, productController.toggleProductActive);

router.get('/me/orders', requireAuth, orderController.getMyOrders);
router.get('/me/orders/:id', requireAuth, orderController.getOrderDetail);
router.post('/orders', requireAuth, orderController.createOrder);
router.get('/patches/:patchId/permission', orderController.checkPermission);
router.get('/me/permissions', requireAuth, orderController.getMyPermissions);

router.get('/admin/orders', requireAdmin, orderController.getAllOrders);
router.get('/admin/orders/stats', requireAdmin, orderController.getOrderStats);

router.get('/me/earnings', requireAuth, earningsController.getMyEarnings);
router.get('/me/earnings/overview', requireAuth, earningsController.getEarningsOverview);
router.post('/me/withdrawals', requireAuth, earningsController.createWithdrawal);
router.get('/me/withdrawals', requireAuth, earningsController.getMyWithdrawals);

router.get('/admin/earnings/stats', requireAdmin, earningsController.getEarningsStats);
router.get('/admin/withdrawals', requireAdmin, earningsController.getAllWithdrawals);
router.put('/admin/withdrawals/:id/review', requireAdmin, earningsController.reviewWithdrawal);

module.exports = router;
