const express= require('express');
const router = express.Router();
const schemas=require('./middelware/Joi_postsure');
const middelware=require('./middelware/sure_token');
const auth=require('./auth/log_singup');
const products=require('./PRODUCTS/proudct');
const cart =require('./PRODUCTS/make_order');
const upload = require('./middelware/multer');
const admin=require('./PRODUCTS/admin');
router.post('/signup',middelware.validate(schemas.signupSchema),auth.signup);
router.post('/login',middelware.validate(schemas.loginSchema),auth.login);

router.get('/products',products.getAllProducts );
router.post('/products/byName', products.getProudctByName);
router.post('/products/byCategory', products.getProductsByCategory);
router.post('/products/inRange', products.getProductsInRange);
router.post('/products/byColor', products.getProductByColor);
router.post(
    '/products/add',
    middelware.sureToken,
    middelware.verifyRole,
    upload.array('images', 5),
    middelware.validate(schemas.addProductSchema),
    products.addProduct
  );
  
router.put('/products/update', middelware.sureToken, middelware.verifyRole, upload.single('image'), products.updateProduct);
router.put('/products/toggle', middelware.sureToken, middelware.verifyRole, products.UnActtiveActtiveProduct);

router.post('/cart/add', middelware.sureToken,middelware.validate(schemas.addToCartSchema), cart.addToCart);
router.delete('/cart/delete', middelware.sureToken,middelware.validate(schemas.delFromCartSchema), cart.delFromCart);
router.get('/cart', middelware.sureToken,cart.getCart);
router.get('/cart/count', middelware.sureToken, cart.getCartCount);
router.post('/cart/update', middelware.sureToken, cart.updateCartItem);
router.post('/orders/confirm',middelware.sureToken,upload.single('payment_screenshot'),middelware.validate(schemas.confirmPaymentSchema),cart.confirmPayment);
router.get('/orders/orderForUser',middelware.sureToken,cart.orderForUser);



router.get('/admin/orders',middelware.sureToken,middelware.verifyRole,admin.getAllOrders);
router.get('/admin/orders/userId',middelware.sureToken,middelware.verifyRole,admin.getOrderByUserId);
router.put('/admin/orders/status',middelware.sureToken,middelware.verifyRole,admin.updateOrderStatus);
router.delete('/admin/users/delete',middelware.sureToken,middelware.verifyRole,admin.deleteUser);
router.get('/admin/users',middelware.sureToken,middelware.verifyRole,admin.getAllUsers);
router.get('/admin/users/email',middelware.sureToken,middelware.verifyRole,admin.getUserByEmail);
router.get('/admin/users/phone',middelware.sureToken,middelware.verifyRole,admin.getUserByPhone);
router.get('/admin/orders/userEmail',middelware.sureToken,middelware.verifyRole,admin.getOrderByUserEmail)
router.get('/isLoggedIn',middelware.sureToken,admin.isLoggedIn);


module.exports = router;