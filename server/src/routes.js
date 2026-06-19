const Router = require('koa-router');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const userController = require('./controllers/userController');
const moduleController = require('./controllers/moduleController');
const patchController = require('./controllers/patchController');
const socialController = require('./controllers/socialController');
const adminController = require('./controllers/adminController');
const collectionController = require('./controllers/collectionController');

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

router.post('/patches/:id/like', requireAuth, socialController.toggleLike);
router.post('/patches/:id/favorite', requireAuth, socialController.toggleFavorite);
router.get('/me/favorites', requireAuth, socialController.getMyFavorites);
router.get('/me/patches', requireAuth, socialController.getMyPatches);
router.get('/me/drafts', requireAuth, socialController.getMyDrafts);
router.get('/me/stats', requireAuth, socialController.getCreatorStats);
router.get('/me/notifications', requireAuth, socialController.getMyNotifications);
router.put('/me/notifications/:id/read', requireAuth, socialController.markNotificationRead);
router.post('/me/notifications/read-all', requireAuth, socialController.markAllNotificationsRead);

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
router.get('/admin/manufacturers', requireAdmin, adminController.getAllManufacturers);
router.post('/admin/manufacturers', requireAdmin, adminController.createManufacturer);
router.put('/admin/manufacturers/:id', requireAdmin, adminController.updateManufacturer);
router.delete('/admin/manufacturers/:id', requireAdmin, adminController.deleteManufacturer);

router.get('/admin/collections', requireAdmin, collectionController.adminGetCollections);
router.post('/admin/collections', requireAdmin, collectionController.createCollection);
router.put('/admin/collections/reorder', requireAdmin, collectionController.reorderCollections);
router.put('/admin/collections/:id', requireAdmin, collectionController.updateCollection);
router.delete('/admin/collections/:id', requireAdmin, collectionController.deleteCollection);
router.post('/admin/collections/:id/patches', requireAdmin, collectionController.addPatchToCollection);
router.put('/admin/collections/:id/patches/:patchId', requireAdmin, collectionController.updatePatchNote);
router.delete('/admin/collections/:id/patches/:patchId', requireAdmin, collectionController.removePatchFromCollection);
router.put('/admin/collections/:id/reorder', requireAdmin, collectionController.reorderPatches);

module.exports = router;
