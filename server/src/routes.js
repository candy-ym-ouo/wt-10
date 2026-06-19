const Router = require('koa-router');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const userController = require('./controllers/userController');
const moduleController = require('./controllers/moduleController');
const patchController = require('./controllers/patchController');
const socialController = require('./controllers/socialController');
const adminController = require('./controllers/adminController');

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

router.get('/compare', requireAuth, socialController.getCompareList);
router.post('/compare/:id', requireAuth, socialController.addToCompare);
router.delete('/compare/:id', requireAuth, socialController.removeFromCompare);
router.post('/compare/clear', requireAuth, socialController.clearCompare);
router.get('/compare/result', socialController.comparePatches);

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

module.exports = router;
