const data = require('../Data/data');
const sureToken = require('../middelware/sure_token');
const multer = require('../middelware/multer');
const cloudinary = require('../Data/cloudinary');
const { Readable } = require('stream');
const nodemailer = require("nodemailer");



const addToCart = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).send({ message: 'Unauthorized' });

    const { product_id, quantity, size, color } = req.body;

    if (quantity <= 0) return res.status(400).send({ message: 'Quantity must be greater than 0' });
    if (!size) return res.status(400).send({ message: 'Size is required' });
    if (!color) return res.status(400).send({ message: 'Color is required' });    const productsQuery = await data.query('SELECT id, stock, is_active FROM products WHERE id = $1', [product_id]);
    if (productsQuery.rows.length === 0 || productsQuery.rows[0].is_active === false) return res.status(404).send({ message: 'Product not found' });
    if (productsQuery.rows[0].stock < quantity) return res.status(400).send({ message: 'Not enough stock' });

    const cartsQuery = await data.query('SELECT id FROM cart WHERE user_id = $1', [user.id]);
    let cart_id;
    if (cartsQuery.rows.length === 0) {
      const newCartQuery = await data.query('INSERT INTO cart (user_id,product_id,quantity) VALUES ($1,$2,$3) RETURNING id', [user.id,product_id,quantity]);
      cart_id = newCartQuery.rows[0].id;
    } else {
      cart_id = cartsQuery.rows[0].id;
    }

    const existingItemsQuery = await data.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size = $3 AND color = $4',
      [cart_id, product_id, size, color]
    );

    if (existingItemsQuery.rows.length > 0) {
      const newQuantity = existingItemsQuery.rows[0].quantity + quantity;
      await data.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [newQuantity, existingItemsQuery.rows[0].id]);
      return res.status(200).send({ message: 'Product quantity updated in cart', cart_id });
    }

    await data.query(
      'INSERT INTO cart_items (cart_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)',
      [cart_id, product_id, quantity, size, color]
    );return res.status(201).send({ message: 'Product added to cart successfully', cart_id });
  } catch (err) {
    return res.status(500).send({ message: 'Server error' });
  }
};


const delFromCart = async (req, res) => {
  try {
    const user = req.user;
    const { product_id } = req.body;
    if (!product_id) return res.status(400).send({ message: 'Product ID required' });

    const cartQuery = await data.query('SELECT id FROM cart WHERE user_id = $1', [user.id]);
    if (cartQuery.rows.length === 0) return res.status(404).send({ message: 'Cart not found' });

    const cart_id = cartQuery.rows[0].id;
    const itemQuery = await data.query('SELECT id FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart_id, product_id]);
    if (itemQuery.rows.length === 0) return res.status(404).send({ message: 'Product not found in cart' });

    await data.query('DELETE FROM cart_items WHERE id = $1', [itemQuery.rows[0].id]);
    const remainingQuery = await data.query('SELECT COUNT(*) AS total FROM cart_items WHERE cart_id = $1', [cart_id]);
    if (parseInt(remainingQuery.rows[0].total) === 0) await data.query('DELETE FROM cart WHERE id = $1', [cart_id]);

    return res.status(200).send({ message: 'Product removed from cart successfully' });
  } catch (err) {
    return res.status(500).send({ message: 'Server error' });
  }
};

const getCart = async (req, res) => {
  try {
    const user = req.user;

    const cartQuery = await data.query('SELECT id FROM cart WHERE user_id = $1', [user.id]);
    if (cartQuery.rows.length === 0) {
      return res.status(404).send({ message: 'Cart is empty' });
    }

    const cart_id = cartQuery.rows[0].id;

    const itemsQuery = await data.query(
      `SELECT 
        cart_items.id AS cart_item_id,
        cart_items.quantity AS cart_quantity,
        cart_items.size AS product_size,
        cart_items.color AS product_color,
        products.id AS product_id,
        products.title AS product_title,
        products.price AS product_price,
        products.discount AS product_discount,
        products.image_url AS product_image,
        products.stock AS product_stock,
        products.is_active AS product_active
      FROM cart_items
      JOIN products ON cart_items.product_id = products.id
      WHERE cart_items.cart_id = $1`,
      [cart_id]
    );

    if (itemsQuery.rows.length === 0) {
      return res.status(404).send({ message: 'Cart is empty' });
    }

    let total = 0;
    const formattedItems = itemsQuery.rows.map(item => {
      const discountAmount = (item.product_price * item.product_discount) / 100;
      const finalPrice = item.product_price - discountAmount;
      const subtotal = finalPrice * item.cart_quantity;
      if (item.product_active === true && item.product_stock > 0) {
        total += subtotal;
      }

      return {
        cart_item_id: item.cart_item_id,
        product_id: item.product_id,
        title: item.product_title,
        quantity: item.cart_quantity,
        price: item.product_price,
        discount: item.product_discount,
        final_price: finalPrice,
        subtotal,
        size: item.product_size,
        color: item.product_color,
        image: item.product_image,
        available: item.product_active === true && item.product_stock > 0
      };
    });

    return res.status(200).send({
      message: 'Cart fetched successfully',
      cart_id,
      total,
      items: formattedItems
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Server error' });
  }
};



const getCartCount = async (req, res) => {
  try {
    const user = req.user;
    const cartQuery = await data.query('SELECT id FROM cart WHERE user_id = $1', [user.id]);
    if (cartQuery.rows.length === 0) return res.status(200).send({ count: 0 });

    const cart_id = cartQuery.rows[0].id;
    const resultQuery = await data.query('SELECT SUM(quantity) AS total FROM cart_items WHERE cart_id = $1', [cart_id]);
    return res.status(200).send({ count: parseInt(resultQuery.rows[0].total) || 0 });
  } catch (err) {
    return res.status(500).send({ message: 'Server error' });
  }
};


const updateCartItem = async (req, res) => {
  try {
    const user = req.user;
    const { product_id, delta, size, color } = req.body;

    if (!product_id) return res.status(400).send({ message: "Product ID is required" });
    if (!size) return res.status(400).send({ message: "Size is required" });
    if (!color) return res.status(400).send({ message: "Color is required" });

    const productQuery = await data.query('SELECT id, stock, is_active FROM products WHERE id = $1', [product_id]);
    if (productQuery.rows.length === 0 || productQuery.rows[0].is_active === false) return res.status(404).send({ message: 'Product not found' });

    let cartQuery = await data.query('SELECT id FROM cart WHERE user_id = $1', [user.id]);
    let cart_id;
    if (cartQuery.rows.length === 0) {
      const newCartQuery = await data.query('INSERT INTO cart (user_id) VALUES ($1) RETURNING id', [user.id]);
      cart_id = newCartQuery.rows[0].id;
    } else {
      cart_id = cartQuery.rows[0].id;
    }

    const existingItemQuery = await data.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size = $3 AND color = $4',
      [cart_id, product_id, size, color]
    );

    if (existingItemQuery.rows.length === 0) {
      if (delta <= 0) return res.status(400).send({ message: 'Cannot decrease, item not in cart' });
      if (productQuery.rows[0].stock < delta) return res.status(400).send({ message: 'No stock available' });

      await data.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)',
        [cart_id, product_id, delta, size, color]
      );
      return res.status(201).send({ message: 'Product added to cart', cart_id });
    }

    let newQuantity = existingItemQuery.rows[0].quantity + delta;

    if (newQuantity <= 0) {
      await data.query('DELETE FROM cart_items WHERE id = $1', [existingItemQuery.rows[0].id]);
      const remainingQuery = await data.query('SELECT COUNT(*) AS total FROM cart_items WHERE cart_id = $1', [cart_id]);
      if (parseInt(remainingQuery.rows[0].total) === 0) await data.query('DELETE FROM cart WHERE id = $1', [cart_id]);
      return res.status(200).send({ message: 'Product removed from cart', cart_id });
    }

    if (newQuantity > productQuery.rows[0].stock) return res.status(400).send({ message: 'No stock available' });

    await data.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [newQuantity, existingItemQuery.rows[0].id]);
    return res.status(200).send({ message: 'Cart updated successfully', cart_id });

  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Server error' });
  }
};



const confirmPayment = async (req, res) => {
  const client = await data.connect();
  try {
    console.log("🚀 بدء عملية تأكيد الدفع...");
    const user = req.user;
    const { payment_method, address } = req.body;
    const file = req.file;

    if (!payment_method) return res.status(400).send({ message: "Payment method is required" });
    if (!address) return res.status(400).send({ message: "Address is required" });
    if (!file) return res.status(400).send({ message: "Payment screenshot is required" });

    console.log("📤 رفع صورة الدفع...");
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "payment_screenshots" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      Readable.from(file.buffer).pipe(stream);
    });
    const payment_screenshot = uploadResult.secure_url;
    console.log("✅ تم رفع صورة الدفع بنجاح");

    console.log("🛒 فحص الكارت والمنتجات...");
    const cartQuery = await data.query("SELECT id FROM cart WHERE user_id = $1", [user.id]);
    if (!cartQuery.rows || cartQuery.rows.length === 0) return res.status(404).send({ message: "Cart is empty" });
    const cart_id = cartQuery.rows[0].id;

    const cartItemsQuery = await data.query(
      `SELECT ci.product_id, ci.quantity, ci.size, ci.color, p.title, p.price, p.discount, p.stock, p.is_active
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cart_id]
    );
    if (!cartItemsQuery.rows || cartItemsQuery.rows.length === 0) return res.status(404).send({ message: "No items in cart" });

    const items = cartItemsQuery.rows.map(r => ({
      product_id: r.product_id,
      quantity: r.quantity,
      size: r.size || "-",
      color: r.color || "-",
      title: r.title,
      price: Number(r.price),
      discount: Number(r.discount) || 0,
      stock: Number(r.stock) || 0,
      is_active: r.is_active
    }));

    console.log("📊 فحص توفر المنتجات...");
    let total = 0;
    for (let item of items) {
      if (!item.is_active) return res.status(400).send({ message: `Product ${item.title} is no longer available` });
      if (item.stock < item.quantity) return res.status(400).send({ message: `Not enough stock for product ${item.title}` });

      const discountAmount = (item.price * (item.discount || 0)) / 100;
      const finalPrice = Number(item.price) - discountAmount;
      total += finalPrice * item.quantity;
    }

    await client.query('BEGIN');

    const orderQuery = await client.query(
      `INSERT INTO orders 
       (user_id, customer_name, customer_email, customer_phone, address, payment_method, payment_screenshot, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id`,
      [user.id, user.name || "", user.email || "", user.phone || "", address, payment_method, payment_screenshot, total]
    );
    const order_id = orderQuery.rows[0].id;

    for (let item of items) {
      const discountAmount = (item.price * (item.discount || 0)) / 100;
      const finalPrice = Number(item.price) - discountAmount;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order_id, item.product_id, item.quantity, finalPrice]
      );

      await client.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, item.product_id]);
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id]);
    await client.query("DELETE FROM cart WHERE id = $1", [cart_id]);

    await client.query('COMMIT');
    console.log("🎉 تم إنشاء الطلب وتحديث المخزون ومسح الكارت بنجاح!");

    (async () => {
      try {
        const formData = require('form-data');
        const Mailgun = require('mailgun.js');
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY, url: process.env.MAILGUN_API_URL });

        await mg.messages.create(process.env.MAILGUN_DOMAIN, {
          from: 'My Shop <no-reply@sandboxaaa40f72b2db4ba0856934a175b037c3.mailgun.org>',
          to: 'yassefsea111@gmail.com',
          subject: 'تأكيد الطلب الجديد',
          text: adminMessage(items, total, user, payment_method, address, payment_screenshot)
        });

        if (user.email) {
          await mg.messages.create(process.env.MAILGUN_DOMAIN, {
            from: 'My Shop <no-reply@sandboxaaa40f72b2db4ba0856934a175b037c3.mailgun.org>',
            to: user.email,
            subject: 'تأكيد الطلب الجديد',
            html: userMessage(items, total, user, payment_method, address)
          });
        }

        console.log("✅ تم إرسال الإيميلات بنجاح عبر Mailgun");
      } catch (emailErr) {
        console.error("❌ فشل في إرسال الإيميلات:", emailErr.message);
      }
    })();

    return res.status(200).send({
      message: "Payment confirmed successfully",
      order_id,
      total: total.toFixed(2),
      payment_screenshot,
      items_count: items.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("💥 خطأ في تأكيد الدفع:", err);
    return res.status(500).send({ message: "Server error during payment confirmation", error: err.message });
  } finally {
    client.release();
  }
};

function adminMessage(items, total, user, payment_method, address, payment_screenshot) {
  let itemList = items.map(i => `- ${i.title} (Size: ${i.size}, Color: ${i.color}) × ${i.quantity} = ${(i.price*(1-(i.discount||0)/100)*i.quantity).toFixed(2)} جنيه`).join('\n');
  return `📦 طلب جديد\n👤 العميل: ${user.name}\n📧 البريد: ${user.email}\n📞 رقم الهاتف: ${user.phone}\n💰 الإجمالي: ${total.toFixed(2)} جنيه\n💳 طريقة الدفع: ${payment_method}\n📍 العنوان: ${address}\n🛒 المنتجات:\n${itemList}\n📸 صورة الدفع: ${payment_screenshot}`;
}

function userMessage(items, total, user, payment_method, address) {
  let itemList = items.map(i => `- ${i.title} (Size: ${i.size}, Color: ${i.color}) × ${i.quantity} = ${(i.price*(1-(i.discount||0)/100)*i.quantity).toFixed(2)} جنيه`).join('<br>');
  return `<h2>مرحباً ${user.name}!</h2>
<p>شكراً لإتمام طلبك معنا. لقد استلمنا صورة الدفع الخاصة بك، وسيتم التحقق منها أولاً.</p>
<p>إذا كانت صورة الدفع صحيحة، سيقوم فريقنا بالتواصل معك قبل موعد وصول الشحنة لتأكيد كل التفاصيل.</p>
<ul>
  <li>💰 <b>الإجمالي:</b> ${total.toFixed(2)} جنيه</li>
  <li>💳 <b>طريقة الدفع:</b> ${payment_method}</li>
  <li>📍 <b>العنوان:</b> ${address}</li>
</ul>
<p><b>🛒 المنتجات:</b><br>${itemList}</p>
<p>شكراً لتسوقك معنا! نتطلع لخدمتك بأفضل شكل ممكن ❤️</p>`;
}




const orderForUser=async (req, res) => {
  const  user = req.user;
  const userId=user.id;
  try {
    const ordersQuery = await data.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    for (let order of ordersQuery.rows) {
      const itemsQuery = await data.query(
        `SELECT 
          oi.product_id, 
          oi.quantity, 
          oi.price, 
          p.title, 
          p.image_url 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsQuery.rows; 
    }

    res.json({
      success: true,
      count: ordersQuery.rows.length,
      orders: ordersQuery.rows,
    });
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
}



module.exports = { addToCart, delFromCart, getCart, getCartCount, updateCartItem, confirmPayment, orderForUser };
