const data = require('../Data/data');
const sureToken = require('../middelware/sure_token');
const multer = require('../middelware/multer');
const cloudinary = require('../Data/cloudinary');
const { Readable } = require('stream');
// const { sendWhatsAppMessage } = require('./whatsapp');
const nodemailer = require("nodemailer");



const addToCart = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).send({ message: 'Unauthorized' });

    const { product_id, quantity, size, color } = req.body;

    if (quantity <= 0) return res.status(400).send({ message: 'Quantity must be greater than 0' });
    if (!size) return res.status(400).send({ message: 'Size is required' });
    if (!color) return res.status(400).send({ message: 'Color is required' });

    const [products] = await data.query('SELECT id, stock, is_active FROM products WHERE id = ?', [product_id]);
    if (products.length === 0 || !products[0].is_active) return res.status(404).send({ message: 'Product not found' });
    if (products[0].stock < quantity) return res.status(400).send({ message: 'Not enough stock' });

    const [carts] = await data.query('SELECT id FROM cart WHERE user_id = ?', [user.id]);
    let cart_id;
    if (carts.length === 0) {
      const [newCart] = await data.query('INSERT INTO cart (user_id,product_id,quantity) VALUES (?,?,?)', [user.id,product_id,quantity]);
      cart_id = newCart.insertId;
    } else {
      cart_id = carts[0].id;
    }

    const [existingItems] = await data.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND size = ? AND color = ?',
      [cart_id, product_id, size, color]
    );

    if (existingItems.length > 0) {
      const newQuantity = existingItems[0].quantity + quantity;
      await data.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, existingItems[0].id]);
      return res.status(200).send({ message: 'Product quantity updated in cart', cart_id });
    }

    await data.query(
      'INSERT INTO cart_items (cart_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?)',
      [cart_id, product_id, quantity, size, color]
    );

    return res.status(201).send({ message: 'Product added to cart successfully', cart_id });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Server error' });
  }
};


const delFromCart = async (req, res) => {
  try {
    const user = req.user;
    const { product_id } = req.body;
    if (!product_id) return res.status(400).send({ message: 'Product ID required' });

    const [cart] = await data.query('SELECT id FROM cart WHERE user_id = ?', [user.id]);
    if (cart.length === 0) return res.status(404).send({ message: 'Cart not found' });

    const cart_id = cart[0].id;
    const [item] = await data.query('SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart_id, product_id]);
    if (item.length === 0) return res.status(404).send({ message: 'Product not found in cart' });

    await data.query('DELETE FROM cart_items WHERE id = ?', [item[0].id]);
    const [remaining] = await data.query('SELECT COUNT(*) AS total FROM cart_items WHERE cart_id = ?', [cart_id]);
    if (remaining[0].total === 0) await data.query('DELETE FROM cart WHERE id = ?', [cart_id]);

    return res.status(200).send({ message: 'Product removed from cart successfully' });
  } catch (err) {
    return res.status(500).send({ message: 'Server error' });
  }
};

const getCart = async (req, res) => {
  try {
    const user = req.user;

    const [cart] = await data.query('SELECT id FROM cart WHERE user_id = ?', [user.id]);
    if (cart.length === 0) {
      return res.status(404).send({ message: 'Cart is empty' });
    }

    const cart_id = cart[0].id;

    const [items] = await data.query(
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
      WHERE cart_items.cart_id = ?`,
      [cart_id]
    );

    if (items.length === 0) {
      return res.status(404).send({ message: 'Cart is empty' });
    }

    let total = 0;
    const formattedItems = items.map(item => {
      const discountAmount = (item.product_price * item.product_discount) / 100;
      const finalPrice = item.product_price - discountAmount;
      const subtotal = finalPrice * item.cart_quantity;
      if (item.product_active && item.product_stock > 0) {
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
        available: item.product_active && item.product_stock > 0
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
    const [cart] = await data.query('SELECT id FROM cart WHERE user_id = ?', [user.id]);
    if (cart.length === 0) return res.status(200).send({ count: 0 });

    const cart_id = cart[0].id;
    const [result] = await data.query('SELECT SUM(quantity) AS total FROM cart_items WHERE cart_id = ?', [cart_id]);
    return res.status(200).send({ count: result[0].total || 0 });
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

    const [product] = await data.query('SELECT id, stock, is_active FROM products WHERE id = ?', [product_id]);
    if (product.length === 0 || !product[0].is_active) return res.status(404).send({ message: 'Product not found' });

    let [cart] = await data.query('SELECT id FROM cart WHERE user_id = ?', [user.id]);
    let cart_id;
    if (cart.length === 0) {
      const [newCart] = await data.query('INSERT INTO cart (user_id) VALUES (?)', [user.id]);
      cart_id = newCart.insertId;
    } else {
      cart_id = cart[0].id;
    }

    const [existingItem] = await data.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND size = ? AND color = ?',
      [cart_id, product_id, size, color]
    );

    if (existingItem.length === 0) {
      if (delta <= 0) return res.status(400).send({ message: 'Cannot decrease, item not in cart' });
      if (product[0].stock < delta) return res.status(400).send({ message: 'No stock available' });

      await data.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?)',
        [cart_id, product_id, delta, size, color]
      );
      return res.status(201).send({ message: 'Product added to cart', cart_id });
    }

    let newQuantity = existingItem[0].quantity + delta;

    if (newQuantity <= 0) {
      await data.query('DELETE FROM cart_items WHERE id = ?', [existingItem[0].id]);
      const [remaining] = await data.query('SELECT COUNT(*) AS total FROM cart_items WHERE cart_id = ?', [cart_id]);
      if (remaining[0].total === 0) await data.query('DELETE FROM cart WHERE id = ?', [cart_id]);
      return res.status(200).send({ message: 'Product removed from cart', cart_id });
    }

    if (newQuantity > product[0].stock) return res.status(400).send({ message: 'No stock available' });

    await data.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, existingItem[0].id]);
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

    // رفع الصورة على Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "payment_screenshots" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      Readable.from(file.buffer).pipe(stream);
    });
    const payment_screenshot = uploadResult.secure_url;

    // ===== جلب بيانات السلة =====
    // نحاول نلاقي cart مرتبط بالمستخدم
    const [cartRows] = await data.query("SELECT id FROM cart WHERE user_id = ?", [user.id]);

    if (!cartRows || cartRows.length === 0) {
      // لا يوجد سلة على الإطلاق
      return res.status(404).send({ message: "Cart is empty" });
    }

    // نحاول استخدام cart_items أولاً (الأسلوب المفضل)
    const cart_id = cartRows[0].id;
    const [cartItemsRows] = await data.query(
      `SELECT ci.product_id, ci.quantity, ci.size, ci.color, p.title, p.price, p.discount, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cart_id]
    );

    let items = [];
    if (cartItemsRows && cartItemsRows.length > 0) {
      // استخدم البيانات من cart_items
      items = cartItemsRows.map(r => ({
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
      // fallback: بعض المشاريع تخزن المنتجات في جدول cart مباشرة
      // نجلب كل الصفوف من جدول cart التي لها user_id (كل صف يمثل عنصر)
      const [cartDirectRows] = await data.query(
        `SELECT product_id, quantity FROM cart WHERE user_id = ?`,
        [user.id]
      );

      if (!cartDirectRows || cartDirectRows.length === 0) {
        return res.status(404).send({ message: "Cart is empty" });
      }

      // الآن نحتاج تفاصيل المنتجات من table products
      const productIds = cartDirectRows.map(r => r.product_id);
      // احصل على تفاصيل كل المنتجات في استعلام واحد
      const [productsInfo] = await data.query(
        `SELECT id, title, price, discount, stock FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
        productIds
      );

      // دمج المعلومات
      items = cartDirectRows.map(row => {
        const p = productsInfo.find(pi => pi.id === row.product_id) || {};
        return {
          product_id: row.product_id,
          quantity: row.quantity,
          size: "-", // غير متوفر في هذه البنية
          color: "-", // غير متوفر
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

    const [orderResult] = await data.query(
      `INSERT INTO orders 
       (user_id, customer_name, customer_email, customer_phone, address, payment_method, payment_screenshot, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user.id, user.name || "", user.email || "", user.phone || "", address, payment_method, payment_screenshot, total]
    );

    const order_id = orderResult.insertId;

    for (let item of items) {
      const discountAmount = (item.price * (item.discount || 0)) / 100;
      const finalPrice = Number(item.price) - discountAmount;

      await data.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [order_id, item.product_id, item.quantity, finalPrice]
      );

      await data.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.quantity, item.product_id]);
    }

    const [checkCartItemsAgain] = await data.query('SELECT COUNT(*) AS cnt FROM cart_items WHERE cart_id = ?', [cart_id]);
    if (checkCartItemsAgain[0].cnt > 0) {
      await data.query("DELETE FROM cart_items WHERE cart_id = ?", [cart_id]);
      await data.query("DELETE FROM cart WHERE id = ?", [cart_id]);
    } else {
      await data.query("DELETE FROM cart WHERE user_id = ?", [user.id]);
    }

    
    const message = `📦 طلب جديد\n👤 العميل: ${user.name}\n📞 رقم الهاتف: ${user.phone}\n💰 الإجمالي: ${total} جنيه\n💳 طريقة الدفع: ${payment_method}\n📍 العنوان: ${address}\n🛒 المنتجات:\n${itemList}\n📸 صورة الدفع: ${payment_screenshot}`;
const message2 = `
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



    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "yassefsea274@gmail.com", // بريدك الحقيقي
        pass: "vyobfqfeuiiepivu"       // استخدم App Password بدون فراغات
      }
    });

    let info = await transporter.sendMail({
      from: '"My Shop" <shop@example.com>',
      to: "yassefsea111@gmail.com", // ممكن تحط أي بريد لتجربة
      subject: "تأكيد الطلب الجديد",
      text: message
    });

    let info2= await transporter.sendMail({
      from: '"My Shop" <shop@example.com>',
      to: `${user.email}`, // ممكن تحط أي بريد لتجربة
      subject: "تأكيد الطلب الجديد",
      text: message2
    });

    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info2));




    return res.status(200).send({
      message: "Payment confirmed successfully",
      order_id,
      total,
      payment_screenshot,
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
    const [orders] = await data.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    for (let order of orders) {
      const [items] = await data.query(
        `SELECT 
          oi.product_id, 
          oi.quantity, 
          oi.price, 
          p.title, 
          p.image_url 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items; 
    }

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
}



module.exports = { addToCart, delFromCart, getCart, getCartCount, updateCartItem, confirmPayment, orderForUser };
