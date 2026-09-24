const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  otp: Joi.string().length(6).pattern(/^[0-9]{6}$/).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});


const addProductSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  description: Joi.string().allow(null, "").optional(),
  price: Joi.number().positive().required(),
  category_name: Joi.string().min(2).max(100).required(),
  discount: Joi.number().min(0).max(100).default(0),
  stock: Joi.number().integer().min(0).required(),
  image_url: Joi.string().uri().allow(null, "").optional(),
  sizes: Joi.string()
    .pattern(/^[A-Za-z0-9, ]*$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": `"sizes" must be a comma-separated string like "S,M,L"`,
    }),
  colors: Joi.string()
    .pattern(/^[A-Za-z\u0600-\u06FF, ]*$/)
    .allow(null, "")
    .optional()    .messages({
      "string.pattern.base": `"colors" must be a comma-separated string like "red,أحمر,blue,أزرق"`,
    }),
    is_active: Joi.alternatives().try(
      Joi.string().valid('1', '0'),
      Joi.number().valid(1, 0)
    ).optional()
});


const addToCartSchema = Joi.object({
product_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required(),
  size: Joi.string().valid('S', 'M', 'L', 'XL', 'XXL','XS','XXXL','XS').required(),
  color: Joi.string().required(),
});

const delFromCartSchema = Joi.object({
  product_id: Joi.number().integer().required(),
});

const confirmPaymentSchema = Joi.object({
  payment_method: Joi.string().valid('vodafone_cash', 'instapay').required(),
  address: Joi.string().min(10).max(300).required(),
  payment_screenshot: Joi.any().optional(),
});

const productSearchByNameSchema = Joi.object({
  title: Joi.string().trim().min(1).max(150).required(),
});

const productCategorySchema = Joi.object({
  category_name: Joi.string().trim().min(1).max(100).required(),
});

const productRangeSchema = Joi.object({
  minPrice: Joi.number().min(0).required(),
  maxPrice: Joi.number().min(Joi.ref('minPrice')).required(),
});

const productColorSchema = Joi.object({
  color: Joi.string().trim().min(1).max(100).required(),
});

const productIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const adminUserIdSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
});

const adminOrderLookupSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
});

const adminEmailLookupSchema = Joi.object({
  email: Joi.string().email().required(),
});

const adminPhoneLookupSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
});

const orderStatusSchema = Joi.object({
  order_id: Joi.number().integer().positive().required(),
  status: Joi.string().trim().min(1).max(50).required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  addProductSchema,
  addToCartSchema,
  delFromCartSchema,
  confirmPaymentSchema,
  productSearchByNameSchema,
  productCategorySchema,
  productRangeSchema,
  productColorSchema,
  productIdSchema,
  adminUserIdSchema,
  adminOrderLookupSchema,
  adminEmailLookupSchema,
  adminPhoneLookupSchema,
  orderStatusSchema,
};
