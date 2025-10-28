const data=require('../Data/data')
const NodeCache=require('node-cache')
const cache=new NodeCache({stdTTL:60})
const cloudinary = require('../Data/cloudinary')
const { Readable } = require('stream')

const getAllProducts=async(req,res)=>{
    try
{
const c=cache.get('allProducts');
if(c){return res.status(200).send({message:'All Products',allProducts:c})}
const [products]=await data.query('SELECT * FROM products WHERE is_active=1');
if(products.length===0){return res.status(404).send({message:'No products found'})}
cache.set('allProducts',products);
return res.status(200).send({message:'All Products',allProducts:products});
}
catch(err){return res.status(500).send({message:'Server error'})};
}

const getProudctByName=async(req,res)=>{
    try
    {
const {title}=req.body;
const u=`product_${title}`;
const c=cache.get(u);
if(c){return res.status(200).send({message:'Product found',product:c})}
const [product]=await data.query('SELECT * FROM products WHERE title=? AND is_active=1',[title]);
if(product.length===0){return res.status(404).send({message:'Product not found'})}
cache.set(u,product)
return res.status(200).send({message:'Product found',product:product})
}
catch(err){return res.status(500).send({message:'Server error'})}
}

const getProductsByCategory=async(req,res)=>{
try{
const {category_name}=req.body;
const u=`cate_${category_name}`;
const c=cache.get(u);
if(c){return res.status(200).send({message:'Products found',products:c})}
const [productsByCate]=await data.query('SELECT * FROM products WHERE category_name=? AND is_active=1',[category_name]);
if(productsByCate.length===0){return res.status(404).send({message:'No products found in this category'})}
cache.set(u,productsByCate)
return res.status(200).send({message:'Products found',products:productsByCate});
}
catch(err){return res.status(500).send({message:'Server error'})};
}

const getProductsInRange=async(req,res)=>{
try
{
const {minPrice,maxPrice}=req.body;
const u=`range_${minPrice}_${maxPrice}`;
const c=cache.get(u);
if(c){return res.status(200).send({message:'Products found',products:c})}
const [productsRange]=await data.query('SELECT * FROM products WHERE price BETWEEN ? AND ? AND is_active=1',[minPrice,maxPrice]);
if(productsRange.length===0)return res.status(404).send({message:'No products found in this price range'})
cache.set(u,productsRange)
return res.status(200).send({message:'Products found',products:productsRange});
}
catch(err){return res.status(500).send({message:'Server error'})}
}


const addProduct = async (req, res) => {
  try {
    const { title, description, price, discount, stock, category_name, sizes, colors } = req.body;
    const files = req.files;

    if (!files || files.length === 0)
      return res.status(400).send({ message: "At least one image is required" });

    const imageUrls = [];

    for (const file of files) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        Readable.from(file.buffer).pipe(stream);
      });
      imageUrls.push(uploadResult.secure_url);
    }

    const image_url = imageUrls.join(",");

    await data.query(
      `INSERT INTO products (title, description, price, discount, stock, image_url, category_name, sizes, colors, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [title, description, price, discount, stock, image_url, category_name, sizes, colors]
    );

    return res.status(200).send({
      message: "Product added successfully",
      image_url
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Internal server error" });
  }
};




const updateProduct = async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      price,
      category_name,
      discount,
      stock,
      image_url,
      sizes,
      colors,
      is_active
    } = req.body;

    if (!id || !title || !price || !category_name) {
      return res.status(400).send({ message: 'Missing required fields' });
    }

    let finalImageUrl = image_url || null;

    // رفع صورة جديدة إذا موجودة
    if (req.file && req.file.buffer) {
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, uploadResult) => {
            if (error) return reject(error);
            resolve(uploadResult.secure_url);
          }
        );
        Readable.from(req.file.buffer).pipe(stream);
      });
      finalImageUrl = await uploadPromise;
    } else if (image_url && image_url !== '0' && image_url !== 0) {
      // تنظيف الرابط من أي فواصل أو مسافات في البداية
      finalImageUrl = image_url.toString().trim().replace(/^,+/, '');
    }

    const updateFields = [];
    const updateValues = [];

    // الحقول الأساسية
    updateFields.push(
      'title = ?',
      'description = ?',
      'price = ?',
      'category_name = ?',
      'discount = ?',
      'stock = ?'
    );

    updateValues.push(
      String(title),
      description ? String(description) : null,
      Number(price),
      String(category_name),
      Number(discount) || 0,
      Number(stock) || 0
    );

    // الصورة
    if (finalImageUrl) {
      updateFields.push('image_url = ?');
      updateValues.push(finalImageUrl);
    }

    // الأحجام
    if (sizes) {
      updateFields.push('sizes = ?');
      updateValues.push(Array.isArray(sizes) ? sizes.join(',') : String(sizes));
    }

    // الألوان
    if (colors) {
      updateFields.push('colors = ?');
      updateValues.push(Array.isArray(colors) ? colors.join(',') : String(colors));
    }

    // حالة النشاط
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(Number(is_active));
    }

    // إضافة الـ id في نهاية القيم
    updateValues.push(Number(id));

    const [result] = await data.query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: 'Product not found' });
    }

    cache.flushAll();
    return res.status(200).send({ message: 'Product updated successfully' });

  } catch (err) {
    console.error('Update Product Error:', err);
    return res.status(500).send({ message: 'Server error', error: err.message });
  }
};




const UnActtiveActtiveProduct=async(req,res)=>{
  try
  {
  const {id}=req.body;
  const [product]=await data.query('SELECT is_active FROM products WHERE id=?',[id]);
  
  if(product.length===0){return res.status(404).send({message:'Product not found'})}
  
  const newStatus=product[0].is_active?0:1;
  
  await data.query('UPDATE products SET is_active=? WHERE id=?',[newStatus,id]);
  cache.flushAll()
  return res.status(200).send({message:`Product ${newStatus?'activated':'deactivated'} successfully`});
  }
  catch(err){return res.status(500).send({message:'Server error'})}
  }

  const getProductByColor = async (req, res) => {
    try {
      const { color } = req.body;
  
      if (!color) {
        return res.status(400).send({ message: 'Color is required' });
      }
  
      const searchColor = color.trim();
  
      // نبحث بحيث أي لون مطابق (عربي أو إنجليزي) يظهر
      const [products] = await data.query(
        `SELECT * FROM products 
         WHERE is_active = 1
         AND (
           colors LIKE ? OR
           colors LIKE ? OR
           colors LIKE ? OR
           colors = ?
         )`,
        [`${searchColor},%`, `%,${searchColor},%`, `%,${searchColor}`, searchColor]
      );
  
      if (products.length === 0) {
        return res.status(404).send({ message: 'No products found for this color' });
      }
  
      return res.status(200).send({ message: 'Products found', products });
    } catch (err) {
      console.error('Get Product By Color Error:', err);
      return res.status(500).send({ message: 'Server error', error: err.message });
    }
  };
  




module.exports={getAllProducts,getProudctByName,getProductsByCategory,getProductsInRange,addProduct,updateProduct,UnActtiveActtiveProduct,getProductByColor};

