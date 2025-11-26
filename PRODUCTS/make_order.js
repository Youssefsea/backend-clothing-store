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
    if (productsQuery.rows[0].stock < quantity) return res.status(400).send({ message: 'Not enough stock' });    const cartsQuery = await data.query('SELECT id FROM cart WHERE user_id = $1', [user.id]);
    let cart_id;
    if (cartsQuery.rows.length === 0) {
      const newCartQuery = await data.query('INSERT INTO cart (user_id) VALUES ($1) RETURNING id', [user.id]);
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
      [cart_id, product_id, quantity, size, color]    );return res.status(201).send({ message: 'Product added to cart successfully', cart_id });
  } catch (err) {
    console.error('Add to cart error:', err);
    return res.status(500).send({ message: 'Server error', error: err.message });
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
  try {
    const user = req.user;
    const { payment_method, address } = req.body;
    const file = req.file;

    if (!payment_method)
      return res.status(400).send({ message: "Payment method is required" });
    if (!address)
      return res.status(400).send({ message: "Address is required" });
    if (!file)
      return res.status(400).send({ message: "Payment screenshot is required" });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "payment_screenshots" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      Readable.from(file.buffer).pipe(stream);
    });
    const payment_screenshot = uploadResult.secure_url;

    const cartQuery = await data.query("SELECT id FROM cart WHERE user_id = $1", [user.id]);
    
    if (!cartQuery.rows || cartQuery.rows.length === 0) {
      return res.status(404).send({ message: "Cart is empty" });
    }

    const cart_id = cartQuery.rows[0].id;
    
    const cartItemsQuery = await data.query(
      `SELECT ci.product_id, ci.quantity, ci.size, ci.color, p.title, p.price, p.discount, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cart_id]
    );

    let items = [];
    if (cartItemsQuery.rows && cartItemsQuery.rows.length > 0) {
      items = cartItemsQuery.rows.map(r => ({
        product_id: r.product_id,
        quantity: r.quantity,
        size: r.size || "-",
        color: r.color || "-",
        title: r.title,
        price: Number(r.price),
        discount: Number(r.discount) || 0,
        stock: Number(r.stock) || 0
      }));
    } else {
      const cartDirectQuery = await data.query(
        `SELECT product_id, quantity FROM cart WHERE user_id = $1`,
        [user.id]
      );

      if (!cartDirectQuery.rows || cartDirectQuery.rows.length === 0) {
        return res.status(404).send({ message: "Cart is empty" });
      }

      const productIds = cartDirectQuery.rows.map(r => r.product_id);
      const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
      
      const productsQuery = await data.query(
        `SELECT id, title, price, discount, stock FROM products WHERE id IN (${placeholders})`,
        productIds
      );

      items = cartDirectQuery.rows.map(row => {
        const p = productsQuery.rows.find(pi => pi.id === row.product_id) || {};
        return {
          product_id: row.product_id,
          quantity: row.quantity,
          size: "-",
          color: "-",
          title: p.title || "Unknown product",
          price: Number(p.price) || 0,
          discount: Number(p.discount) || 0,
          stock: Number(p.stock) || 0
        };
      });
    }

    if (items.length === 0) return res.status(400).send({ message: "No items in cart" });

    let total = 0;
    let itemList = "";

    for (let item of items) {
      const discountAmount = (item.price * (item.discount || 0)) / 100;
      const finalPrice = Number(item.price) - discountAmount;
      const subtotal = finalPrice * Number(item.quantity || 0);

      if (item.stock < item.quantity) {
        return res.status(400).send({ message: `Not enough stock for product ${item.title}` });
      }

      total += subtotal;
      itemList += `- ${item.title} (Size: ${item.size}, Color: ${item.color}) × ${item.quantity} = ${subtotal} جنيه\n`;
    }

    const orderQuery = await data.query(
      `INSERT INTO orders 
       (user_id, customer_name, customer_email, customer_phone, address, payment_method, payment_screenshot, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id`,
      [user.id, user.name || "", user.email || "", user.phone || "", address, payment_method, payment_screenshot, total]
    );

    const order_id = orderQuery.rows[0].id;

    for (let item of items) {
      const discountAmount = (item.price * (item.discount || 0)) / 100;
      const finalPrice = Number(item.price) - discountAmount;

      await data.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order_id, item.product_id, item.quantity, finalPrice]
      );

      await data.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, item.product_id]);
    }

    const adminMessage = `📦 طلب جديد\n👤 العميل: ${user.name}\n📞 رقم الهاتف: ${user.phone}\n💰 الإجمالي: ${total} جنيه\n💳 طريقة الدفع: ${payment_method}\n📍 العنوان: ${address}\n🛒 المنتجات:\n${itemList}\n📸 صورة الدفع: ${payment_screenshot}`;
    
    const userMessage = `
<h2>مرحباً ${user.name}!</h2>
<p>شكراً لإتمام طلبك معنا. لقد استلمنا صورة الدفع الخاصة بك، وسيتم التحقق منها أولاً.</p>
<p>إذا كانت صورة الدفع صحيحة، سيقوم فريقنا بالتواصل معك قبل موعد وصول الشحنة لتأكيد كل التفاصيل.</p>
<ul>
  <li>💰 <b>الإجمالي:</b> ${total} جنيه</li>
  <li>💳 <b>طريقة الدفع:</b> ${payment_method}</li>
  <li>📍 <b>العنوان:</b> ${address}</li>
</ul>
<p><b>🛒 المنتجات:</b><br>${itemList.replace(/\n/g, '<br>')}</p>
<p>شكراً لتسوقك معنا! نتطلع لخدمتك بأفضل شكل ممكن ❤️</p>
`;

    let emailSuccess = false;
    try {

      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "yassefsea274@gmail.com",
          pass: "vyobfqfeuiiepivu"
        }
      });

      await transporter.sendMail({
        from: '"My Shop" <yassefsea274@gmail.com>',
        to: "yassefsea111@gmail.com",
        subject: "تأكيد الطلب الجديد",
        text: adminMessage
      });

      await transporter.sendMail({
        from: '"My Shop" <yassefsea274@gmail.com>',
        to: user.email,
        subject: "تأكيد الطلب الجديد",
        html: userMessage
      });

      emailSuccess = true;
      console.log("✅ تم إرسال الإيميلات بنجاح");
    } catch (emailError) {
      console.error("❌ خطأ في إرسال الإيميل:", emailError.message);
      emailSuccess = false;
    }

    try {
      const checkCartItemsQuery = await data.query('SELECT COUNT(*) AS cnt FROM cart_items WHERE cart_id = $1', [cart_id]);
      if (parseInt(checkCartItemsQuery.rows[0].cnt) > 0) {
        await data.query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id]);
        await data.query("DELETE FROM cart WHERE id = $1", [cart_id]);
      } else {
        await data.query("DELETE FROM cart WHERE user_id = $1", [user.id]);
      }
      
      console.log("✅ تم مسح الكارت بنجاح");
    } catch (cartClearError) {
      console.error("❌ خطأ في مسح الكارت:", cartClearError.message);
    }

    return res.status(200).send({
      message: "Payment confirmed successfully",
      order_id,
      total,
      payment_screenshot,
      email_sent: emailSuccess,
      warning: emailSuccess ? null : "Order created successfully but email notification failed"
    });

  } catch (err) {
    console.error("Payment Error:", err);
    return res.status(500).send({ message: "Server error", error: err.message || err });
  }
};


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
