const { getLocaleFromRequest, translate } = require('../controllers/i18nController');

const i18nMiddleware = async (ctx, next) => {
  ctx.state.locale = getLocaleFromRequest(ctx);

  ctx.t = (key, params = {}) => {
    return translate(key, ctx.state.locale, params);
  };

  ctx.i18nError = (status, key, params = {}) => {
    ctx.status = status;
    ctx.body = { error: translate(key, ctx.state.locale, params) };
  };

  await next();
};

const i18nResponseWrapper = async (ctx, next) => {
  await next();

  if (ctx.body && typeof ctx.body === 'object' && ctx.body.message && !ctx.body.localized) {
    const translated = translate(ctx.body.message, ctx.state.locale, ctx.body.params || {});
    if (translated !== ctx.body.message) {
      ctx.body.message = translated;
      ctx.body.localized = true;
    }
  }
};

module.exports = {
  i18nMiddleware,
  i18nResponseWrapper
};
